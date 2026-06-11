/**
 * Enhancement pipeline — types, analysis, platform specs, quality gates.
 *
 * Pipeline order (matches spec exactly):
 *   1. analyze   — probe source, branch pipeline
 *   2. denoise   — temporal-like smoothing (canvas pre-pass; full temporal needs FFmpeg)
 *   3. stabilize — crop-based stabilization hint (true deshake needs FFmpeg/Replicate)
 *   4. upscale   — AI detail synthesis via Replicate Real-ESRGAN video model
 *   5. color     — auto-WB, S-curve, highlight recovery, skin-tone mask
 *   6. sharpen   — unsharp mask convolution (detail-aware, zero halos)
 *   7. export    — per-platform variants at correct bitrate/resolution
 */

/* ── Types ──────────────────────────────────────────────── */

export type PipelineStage =
  | 'analyze' | 'denoise' | 'stabilize' | 'upscale'
  | 'face_restore' | 'color' | 'sharpen' | 'export'

export type QualityGrade = 'excellent' | 'good' | 'fair' | 'poor'

export interface SourceAnalysis {
  width:        number
  height:       number
  fps:          number
  duration:     number
  fileSize?:    number          // bytes, if available
  qualityGrade: QualityGrade
  pixelCount:   number
  isVertical:   boolean
  isLowRes:     boolean         // below 1280×720
  isLowLight:   boolean         // luma average < 80/255
  hasFaces:     boolean         // detected client-side
  upscaleFactor: 2 | 4
  estimatedNoise: 'low' | 'medium' | 'high'
  recommendedStages: PipelineStage[]
  skipDenoise:  boolean
  skipStabilize: boolean
}

/* ── Platform export specs ──────────────────────────────── */

export interface PlatformSpec {
  id:            string
  label:         string
  width:         number
  height:        number
  aspect:        '9:16' | '16:9' | '1:1'
  // MediaRecorder videoBitsPerSecond target (bps)
  bitrate:       number
  // Max file size for platform re-upload (MB)
  maxFileSizeMB: number
  fps:           30 | 60
  notes:         string
}

export const PLATFORM_SPECS: PlatformSpec[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    width: 1080, height: 1920,
    aspect: '9:16',
    // TikTok re-encodes at ~10 Mbps — give it 25 Mbps so there's headroom
    bitrate: 25_000_000,
    maxFileSizeMB: 287,
    fps: 30,
    notes: 'H.264-compatible, 9:16. Avoid going over 287 MB or TikTok will reject upload.',
  },
  {
    id: 'reels',
    label: 'Reels',
    width: 1080, height: 1920,
    aspect: '9:16',
    bitrate: 25_000_000,
    maxFileSizeMB: 200,
    fps: 30,
    notes: 'Instagram Reels re-encodes at ~5 Mbps. 25 Mbps source bitrate preserves detail after compression.',
  },
  {
    id: 'shorts',
    label: 'Shorts',
    width: 1080, height: 1920,
    aspect: '9:16',
    // YouTube accepts up to 60 fps — worth keeping if source is 60
    bitrate: 35_000_000,
    maxFileSizeMB: 256,
    fps: 60,
    notes: 'YouTube Shorts re-encodes to VP9. Higher bitrate source = better detail retention after their codec.',
  },
  {
    id: '4k-master',
    label: '4K Master',
    width: 3840, height: 2160,
    aspect: '16:9',
    // Spec requires ≥45 Mbps for 4K30; targeting 80 Mbps for full detail
    bitrate: 80_000_000,
    maxFileSizeMB: 4096,
    fps: 30,
    notes: '4K master for archival and platform-agnostic re-export. H.264/VP9 at 80 Mbps.',
  },
  {
    id: '4k-vertical',
    label: '4K Vertical',
    width: 2160, height: 3840,
    aspect: '9:16',
    bitrate: 80_000_000,
    maxFileSizeMB: 4096,
    fps: 30,
    notes: '4K vertical master. Downscale to any platform variant from this.',
  },
]

/* ── Source analysis ────────────────────────────────────── */

export function analyzeSource(params: {
  width: number
  height: number
  fps: number
  duration: number
  fileSize?: number
  avgLuma?: number      // 0–255, measured client-side from a sample frame
  hasFaces?: boolean
}): SourceAnalysis {
  const { width, height, fps, duration, fileSize, avgLuma = 128, hasFaces = false } = params

  const px           = width * height
  const is4K         = px >= 3_686_400              // 3840×960 threshold
  const isFHD        = px >= 1_920_000              // 1920×1000
  const isHD         = px >= 921_600                // 1280×720
  const isVertical   = height > width
  const isLowRes     = !isHD
  const isLowLight   = avgLuma < 80

  const qualityGrade: QualityGrade =
    is4K  ? 'excellent' :
    isFHD ? 'good'      :
    isHD  ? 'fair'      : 'poor'

  // Noise estimate — heuristic (low light = high noise on phone sensors)
  const estimatedNoise: 'low' | 'medium' | 'high' =
    isLowLight ? 'high' : qualityGrade === 'poor' ? 'medium' : 'low'

  // Upscale factor: 4× for anything below 1080p, 2× for 1080p–2K, 1× skip for 4K
  const upscaleFactor: 2 | 4 = isFHD || is4K ? 2 : 4

  // Pipeline branches — skip stages that aren't needed
  const skipDenoise   = estimatedNoise === 'low' && !isLowLight
  const skipStabilize = true  // requires FFmpeg/Replicate deshake model; hint only in v1

  const recommendedStages: PipelineStage[] = ['analyze']
  if (!skipDenoise)   recommendedStages.push('denoise')
  if (!skipStabilize) recommendedStages.push('stabilize')  // only when deshake available
  recommendedStages.push('upscale')
  if (hasFaces)       recommendedStages.push('face_restore')
  recommendedStages.push('color', 'sharpen', 'export')

  return {
    width, height, fps, duration, fileSize,
    qualityGrade, pixelCount: px,
    isVertical, isLowRes, isLowLight, hasFaces,
    upscaleFactor, estimatedNoise,
    recommendedStages,
    skipDenoise, skipStabilize,
  }
}

/* ── Quality gate types ─────────────────────────────────── */

export interface QualityGateResult {
  passed:              boolean
  // Simplified SSIM approximation (0–1; 1 = identical)
  ssimApprox:          number
  // Mean luma delta across sampled frames (negative = got darker = regression risk)
  lumaDelta:           number
  // Number of abrupt frame-to-frame brightness jumps (flicker)
  flickerCount:        number
  regressionDetected:  boolean
  recommendation:      'proceed' | 'fallback_source' | 're_render'
}

/** Threshold values used to pass/fail quality gates */
export const QUALITY_THRESHOLDS = {
  minSsim:        0.75,   // below this → likely regression
  maxLumaDrop:   -15,     // more than 15-point avg luma drop → suspect
  maxFlicker:     3,      // more than 3 abrupt jumps in a 10s sample → flicker
}

/* ── Stage metadata (for UI progress display) ───────────── */

export const STAGE_META: Record<PipelineStage, { label: string; icon: string; desc: string }> = {
  analyze:      { label: 'Analyzing',      icon: '🔍', desc: 'Probing source — resolution, fps, noise, exposure' },
  denoise:      { label: 'Denoising',      icon: '✨', desc: 'Reducing noise before upscale (temporal pre-pass)' },
  stabilize:    { label: 'Stabilizing',    icon: '🎯', desc: 'Smoothing camera shake, preserving intentional pans' },
  upscale:      { label: 'Upscaling',      icon: '⬆️', desc: 'AI detail synthesis — reconstructing texture and sharpness' },
  face_restore: { label: 'Face restore',   icon: '👤', desc: 'Dedicated face pass at reduced strength (avoids waxy look)' },
  color:        { label: 'Color grading',  icon: '🎨', desc: 'Auto white balance, S-curve, skin-tone protection' },
  sharpen:      { label: 'Sharpening',     icon: '💎', desc: 'Detail-aware unsharp mask — zero halos' },
  export:       { label: 'Exporting',      icon: '📦', desc: 'Per-platform variants at correct bitrate/resolution' },
}

/* ── Pipeline job state (for polling) ──────────────────── */

export type PipelineJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'fallback'

export interface PipelineJob {
  id:              string
  currentStage:    PipelineStage
  stageProgress:   number         // 0–100 within current stage
  overallProgress: number         // 0–100 across all stages
  status:          PipelineJobStatus
  replicateId?:    string         // upscale job
  faceReplicateId?: string        // face restore job (optional)
  outputUrl?:      string         // final upscaled URL
  error?:          string
  analysis:        SourceAnalysis
  fallbackReason?: string
}

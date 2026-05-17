'use client';
import {
  memo,
  ReactNode,
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  forwardRef,
} from 'react';
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Input ====================

const Input = memo(
  forwardRef(function Input(
    { className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const radius = 120;
    const [visible, setVisible] = useState(false);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <motion.div
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${visible ? radius + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px,
              #6366f1,
              transparent 80%
            )
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="group/input rounded-lg p-[1.5px] transition duration-300"
      >
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border-none bg-[#0d0d14] px-3 py-2 text-sm text-white',
            'placeholder:text-[#4a4a5a] transition duration-400',
            'focus-visible:ring-[1.5px] focus-visible:ring-indigo-500/60 focus-visible:outline-none',
            'shadow-[0px_0px_1px_1px_rgba(255,255,255,0.06)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  })
);

Input.displayName = 'Input';

// ==================== Label ====================

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
}

const Label = memo(function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-[#94a3b8]',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});

// ==================== BoxReveal ====================

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

const BoxReveal = memo(function BoxReveal({
  children,
  width = 'fit-content',
  boxColor,
  duration,
  overflow = 'hidden',
  position = 'relative',
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      slideControls.start('visible');
      mainControls.start('visible');
    } else {
      slideControls.start('hidden');
      mainControls.start('hidden');
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <section
      ref={ref}
      style={{
        position: position as 'relative' | 'absolute' | 'fixed' | 'sticky' | 'static',
        width,
        overflow,
      }}
      className={className}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 75 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: duration ?? 0.5, delay: 0.25 }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{ hidden: { left: 0 }, visible: { left: '100%' } }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: duration ?? 0.5, ease: 'easeIn' }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor ?? '#0d0d14',
          borderRadius: 4,
        }}
      />
    </section>
  );
});

// ==================== Ripple ====================

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.18,
  numCircles = 8,
  className = '',
}: RippleProps) {
  return (
    <section
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        '[mask-image:linear-gradient(to_bottom,black,transparent)]',
        className
      )}
      style={{ background: 'transparent' }}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 65;
        const opacity = mainCircleOpacity - i * 0.018;
        const animationDelay = `${i * 0.08}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';

        return (
          <span
            key={i}
            className="absolute animate-ripple rounded-full border border-indigo-500/20"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: Math.max(opacity, 0.02),
              animationDelay,
              borderStyle,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, rgba(99,102,241,${(mainCircleOpacity - i * 0.02).toFixed(2)}) 0%, transparent 70%)`,
            }}
          />
        );
      })}
    </section>
  );
});

// ==================== OrbitingCircles ====================

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-indigo-500/10 stroke-1"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      <section
        style={
          {
            '--duration': duration,
            '--radius': radius,
            '--delay': -delay,
          } as React.CSSProperties
        }
        className={cn(
          'absolute flex size-full transform-gpu animate-orbit items-center justify-center rounded-full',
          'border border-transparent bg-transparent',
          '[animation-delay:calc(var(--delay)*1000ms)]',
          { '[animation-direction:reverse]': reverse },
          className
        )}
      >
        {children}
      </section>
    </>
  );
});

// ==================== TechOrbitDisplay ====================

type IconConfig = {
  className?: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
  component: () => React.ReactNode;
};

type TechOrbitDisplayProps = {
  iconsArray: IconConfig[];
  text?: string;
};

const TechOrbitDisplay = memo(function TechOrbitDisplay({
  iconsArray,
  text = 'BrandLift',
}: TechOrbitDisplayProps) {
  return (
    <section className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-white to-slate-500/50 bg-clip-text text-center text-6xl font-semibold leading-none text-transparent select-none">
        {text}
      </span>
      {iconsArray.map((icon, index) => (
        <OrbitingCircles
          key={index}
          className={icon.className}
          duration={icon.duration}
          delay={icon.delay}
          radius={icon.radius}
          path={icon.path}
          reverse={icon.reverse}
        >
          {icon.component()}
        </OrbitingCircles>
      ))}
    </section>
  );
});

// ==================== BottomGradient ====================

const BottomGradient = () => (
  <>
    <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
  </>
);

// ==================== AnimatedForm ====================

type FieldType = 'text' | 'email' | 'password';

type Field = {
  label: string;
  required?: boolean;
  type: FieldType;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type AnimatedFormProps = {
  header: string;
  subHeader?: string;
  fields: Field[];
  submitButton: string;
  textVariantButton?: string;
  errorField?: string;
  fieldPerRow?: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  googleLogin?: string;
  goTo?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

type Errors = { [key: string]: string };

const AnimatedForm = memo(function AnimatedForm({
  header,
  subHeader,
  fields,
  submitButton,
  textVariantButton,
  errorField,
  fieldPerRow = 1,
  onSubmit,
  googleLogin,
  goTo,
}: AnimatedFormProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});

  const toggleVisibility = () => setVisible(!visible);

  const validateForm = (event: FormEvent<HTMLFormElement>) => {
    const currentErrors: Errors = {};
    fields.forEach((field) => {
      const value = (event.target as HTMLFormElement)[field.label]?.value;
      if (field.required && !value) currentErrors[field.label] = `${field.label} is required`;
      if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value))
        currentErrors[field.label] = 'Invalid email address';
      if (field.type === 'password' && value && value.length < 6)
        currentErrors[field.label] = 'Password must be at least 6 characters';
    });
    return currentErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors = validateForm(event);
    if (Object.keys(formErrors).length === 0) {
      onSubmit(event);
    } else {
      setErrors(formErrors);
    }
  };

  return (
    <section className="max-md:w-full flex flex-col gap-4 w-96 mx-auto">
      <BoxReveal boxColor="#0d0d14" duration={0.3}>
        <h2 className="font-bold text-3xl text-white">{header}</h2>
      </BoxReveal>

      {subHeader && (
        <BoxReveal boxColor="#0d0d14" duration={0.3} className="pb-2">
          <p className="text-[#64748b] text-sm max-w-sm">{subHeader}</p>
        </BoxReveal>
      )}

      {googleLogin && (
        <>
          <BoxReveal boxColor="#0d0d14" duration={0.3} overflow="visible" width="unset">
            <button
              className="g-button group/btn w-full rounded-lg h-10 font-medium outline-hidden hover:cursor-pointer bg-[#0d0d14] text-[#94a3b8] hover:bg-[#111118] transition-colors"
              type="button"
              onClick={() => console.log('Google login clicked')}
            >
              <span className="flex items-center justify-center w-full h-full gap-2.5 text-sm">
                <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLogin}
              </span>
              <BottomGradient />
            </button>
          </BoxReveal>

          <BoxReveal boxColor="#0d0d14" duration={0.3} width="100%">
            <section className="flex items-center gap-4">
              <hr className="flex-1 border-dashed border-[rgba(255,255,255,0.08)]" />
              <p className="text-[#4a4a5a] text-sm">or</p>
              <hr className="flex-1 border-dashed border-[rgba(255,255,255,0.08)]" />
            </section>
          </BoxReveal>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <section className={`grid grid-cols-1 md:grid-cols-${fieldPerRow} mb-4`}>
          {fields.map((field) => (
            <section key={field.label} className="flex flex-col gap-2 mb-4">
              <BoxReveal boxColor="#0d0d14" duration={0.3}>
                <Label htmlFor={field.label}>
                  {field.label} {field.required && <span className="text-indigo-400">*</span>}
                </Label>
              </BoxReveal>

              <BoxReveal width="100%" boxColor="#0d0d14" duration={0.3} className="flex flex-col space-y-1 w-full">
                <section className="relative">
                  <Input
                    type={field.type === 'password' ? (visible ? 'text' : 'password') : field.type}
                    id={field.label}
                    placeholder={field.placeholder}
                    onChange={field.onChange}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={toggleVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4a4a5a] hover:text-[#94a3b8] transition-colors"
                    >
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  )}
                </section>
                <section className="h-4">
                  {errors[field.label] && (
                    <p className="text-red-400 text-xs">{errors[field.label]}</p>
                  )}
                </section>
              </BoxReveal>
            </section>
          ))}
        </section>

        <BoxReveal width="100%" boxColor="#0d0d14" duration={0.3}>
          {errorField && <p className="text-red-400 text-sm mb-4">{errorField}</p>}
        </BoxReveal>

        <BoxReveal width="100%" boxColor="#0d0d14" duration={0.3} overflow="visible">
          <button
            className="group/btn relative w-full h-10 rounded-lg font-medium text-sm
              bg-indigo-600 hover:bg-indigo-500 text-white
              transition-colors duration-200 outline-hidden hover:cursor-pointer
              shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            type="submit"
          >
            {submitButton} →
            <BottomGradient />
          </button>
        </BoxReveal>

        {textVariantButton && goTo && (
          <BoxReveal boxColor="#0d0d14" duration={0.3}>
            <section className="mt-4 text-center">
              <button
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors outline-hidden hover:cursor-pointer"
                onClick={goTo}
              >
                {textVariantButton}
              </button>
            </section>
          </BoxReveal>
        )}
      </form>
    </section>
  );
});

// ==================== AuthTabs ====================

interface AuthTabsProps {
  formFields: {
    header: string;
    subHeader?: string;
    fields: Array<{
      label: string;
      required?: boolean;
      type: string;
      placeholder: string;
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    }>;
    submitButton: string;
    textVariantButton?: string;
  };
  goTo: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const AuthTabs = memo(function AuthTabs({ formFields, goTo, handleSubmit }: AuthTabsProps) {
  return (
    <div className="flex max-lg:justify-center w-full md:w-auto">
      <div className="w-full lg:w-1/2 h-[100dvh] flex flex-col justify-center items-center max-lg:px-[10%]">
        <AnimatedForm
          {...(formFields as AnimatedFormProps)}
          fieldPerRow={1}
          onSubmit={handleSubmit}
          goTo={goTo}
          googleLogin="Continue with Google"
        />
      </div>
    </div>
  );
});

export {
  Input,
  BoxReveal,
  Ripple,
  OrbitingCircles,
  TechOrbitDisplay,
  AnimatedForm,
  AuthTabs,
  Label,
  BottomGradient,
};

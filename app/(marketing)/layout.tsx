import Nav from '@/components/marketing/Nav'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  )
}

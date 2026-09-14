import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Sparkles, SmartphoneNfc, Briefcase, Menu } from "lucide-react";
import UserLoginButton from "@/components/UserLoginButton";

export default function Home() {
  return (
    <main className="bg-mochingo-warm-oat text-mochingo-rich-black selection:bg-mochingo-rich-black selection:text-mochingo-warm-oat font-sans">

      {/* ═══════════════════════════════════════════════════
          HERO — sealed 100svh container, overflow:hidden
          The image CANNOT escape this section.
      ═══════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col lg:overflow-hidden"
        style={{ background: '#F2EDE7', minHeight: '100svh' }}
      >
        {/* Desktop seals to exactly 100svh; mobile grows naturally */}
        <style>{`@media(min-width:1024px){.hero-seal{height:100svh;overflow:hidden;}}`}</style>
        <div className="hero-seal flex flex-col" style={{ flex: 1, position: 'relative' }}>

          {/* ── Header ── */}
          <header className="relative z-20 flex items-center justify-between px-6 md:px-14 py-5 md:py-6 shrink-0">
            <div className="w-28 md:w-36 relative h-7 md:h-8">
              <Image
                src="/images/brand/mochingo-primary-black.svg"
                alt="Mochingo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold tracking-wide">
              {/* <Link href="#" className="hover:opacity-60 transition-opacity">Products</Link>
              <Link href="#" className="hover:opacity-60 transition-opacity">Business</Link>
              <Link href="#" className="hover:opacity-60 transition-opacity">Support</Link> */}
            </nav>
            {/* Desktop CTA + User */}
            <div className="hidden lg:flex items-center gap-3">
              <UserLoginButton />
            </div>
            {/* Mobile: user icon + hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <UserLoginButton />
              <button
                className="p-2 rounded-lg hover:bg-mochingo-rich-black/8 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </header>

        {/* ── Right visual container — sealed by overflow:hidden on section ── */}
        <div
          className="absolute hidden lg:flex items-center justify-end"
          style={{
            top: 0,
            right: 0,
            width: '62%',
            height: '100%',
            zIndex: 10,
            overflow: 'hidden',   /* belt AND braces — image cannot exit this div either */
          }}
        >
          {/* Left-edge feather — wide multi-stop gradient using exact brand colour at each opacity.
              This reads as the warm page background dissolving into photography,
              NOT as a white overlay sitting on top of the image. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '320px',
              height: '100%',
              background: [
                'linear-gradient(to right,',
                '  #F2EDE7 0%,',
                '  rgba(242,237,231,0.94) 14%,',
                '  rgba(242,237,231,0.78) 28%,',
                '  rgba(242,237,231,0.48) 48%,',
                '  rgba(242,237,231,0.16) 68%,',
                '  rgba(242,237,231,0.04) 84%,',
                '  rgba(242,237,231,0) 100%',
                ')',
              ].join(''),
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
          {/* THE IMAGE — object-contain keeps full aspect ratio, no cropping.
              CSS mask is a second blend layer: the image itself fades in from
              transparent so there is no hard boundary even if the gradient
              above is insufficient at extreme viewport widths. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-products.jpg"
            alt="Mochingo NFC stands — Google, Instagram, WhatsApp"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center right',
              display: 'block',
              position: 'relative',
              zIndex: 1,
              WebkitMaskImage: [
                'linear-gradient(to right,',
                '  transparent 0%,',
                '  rgba(0,0,0,0.18) 10%,',
                '  rgba(0,0,0,0.55) 22%,',
                '  rgba(0,0,0,0.85) 34%,',
                '  black 46%',
                ')',
              ].join(''),
              maskImage: [
                'linear-gradient(to right,',
                '  transparent 0%,',
                '  rgba(0,0,0,0.18) 10%,',
                '  rgba(0,0,0,0.55) 22%,',
                '  rgba(0,0,0,0.85) 34%,',
                '  black 46%',
                ')',
              ].join(''),
            }}
          />
        </div>

          {/* ── Left content ── */}
          <div
            className="relative flex flex-col justify-center flex-1 px-6 md:px-14 pb-4"
            style={{ width: '100%', maxWidth: '100%' }}
          >
            {/* On desktop, constrain width to 48% via inline override */}
            <style>{`@media(min-width:1024px){.hero-left-content{width:48%!important;}}`}</style>
            <div className="hero-left-content" style={{ zIndex: 20 }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] mb-4 md:mb-5" style={{ color: 'rgba(0,0,0,0.5)' }}>
                SMART CONNECTIONS
              </p>
              <h1
                className="font-black leading-[0.93] tracking-tighter mb-5 md:mb-6"
                style={{ fontSize: 'clamp(52px, 10vw, 76px)', maxWidth: '440px' }}
              >
                Build for a<br />brighter<br />tomorrow.
              </h1>
              <p
                className="text-base md:text-lg font-medium mb-7 md:mb-8 leading-relaxed"
                style={{ maxWidth: '400px', color: 'rgba(0,0,0,0.75)' }}
              >
                High-quality products crafted with the help of technology.
                Designed with care, made with precision.
              </p>
              <div className="flex flex-wrap gap-4 md:gap-5 items-center">
                <button
                  className="bg-mochingo-rich-black text-mochingo-warm-oat px-7 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-mochingo-rich-black/90 transition-all flex items-center gap-3 group"
                >
                  Explore Products
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center gap-3 font-semibold text-sm hover:opacity-60 transition-opacity">
                  <div className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: 'rgba(0,0,0,0.3)' }}>
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                  Watch How It Works
                </button>
              </div>
            </div>
          </div>

          {/* Mobile product image — full bleed with top-fade, only on small screens */}
          <div className="block lg:hidden w-full shrink-0 relative">
            {/* Top gradient fades image into warm oat background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(to bottom, #F2EDE7 0%, rgba(242,237,231,0) 100%)',
              zIndex: 2,
              pointerEvents: 'none',
            }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-products.jpg"
              alt="Mochingo NFC stands"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* ── Benefits strip ── */}
          <style>{`@media(min-width:1024px){.hero-benefits{width:48%!important;}}`}</style>
          <div
            className="hero-benefits relative shrink-0 px-6 md:px-14 pt-5 pb-6 border-t"
            style={{ borderColor: '#D8D1C8', width: '100%', zIndex: 20 }}
          >
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col gap-0.5">
                <Sparkles className="w-3.5 h-3.5 mb-1" style={{ color: 'rgba(0,0,0,0.45)' }} />
                <p className="font-bold text-xs">Premium Quality</p>
                <p className="text-xs" style={{ color: 'rgba(0,0,0,0.55)' }}>Built to last</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <SmartphoneNfc className="w-3.5 h-3.5 mb-1" style={{ color: 'rgba(0,0,0,0.45)' }} />
                <p className="font-bold text-xs">Easy to Use</p>
                <p className="text-xs" style={{ color: 'rgba(0,0,0,0.55)' }}>Tap. Scan. Connect.</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <Briefcase className="w-3.5 h-3.5 mb-1" style={{ color: 'rgba(0,0,0,0.45)' }} />
                <p className="font-bold text-xs">Designed for Business</p>
                <p className="text-xs" style={{ color: 'rgba(0,0,0,0.55)' }}>Make every interaction count</p>
              </div>
            </div>
          </div>

        </div>{/* end .hero-seal */}
      </section>
      {/* ═══════════════════════════════════════════════════
          HERO ENDS — all following sections start fresh
      ═══════════════════════════════════════════════════ */}

      {/* Feature Section */}
      <section className="bg-mochingo-rich-black text-mochingo-warm-oat px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16 lg:gap-24">
          <div className="flex-1 w-full relative aspect-square max-w-lg">
            <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden shadow-2xl">
              <Image src="/images/matte-bottle.png" alt="Mochingo Products" fill className="object-cover" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Thoughtful design.<br />Real impact.
            </h2>
            <div className="h-px w-16 bg-mochingo-warm-oat/30 mb-8"></div>
            <p className="text-lg md:text-xl text-mochingo-warm-oat/70 max-w-md mb-12">
              We use a contemporary approach that balances simplicity with strong visual presence, aligning with our brand's minimal and modern identity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-2">Omnichannel Retail</h3>
                <p className="text-sm text-mochingo-warm-oat/60 leading-relaxed">Seamless experiences across every touchpoint, from physical spaces to digital environments.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Smart Manufacturing</h3>
                <p className="text-sm text-mochingo-warm-oat/60 leading-relaxed">Leveraging the latest technology and our proprietary dynamic QR platform to ensure absolute precision.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-16 md:py-24 border-t border-mochingo-oat-line/50 text-center flex flex-col items-center">
        <Link href="/portal-x" className="w-12 h-12 relative mb-8 hover:opacity-80 transition-opacity">
          <Image src="/images/brand/mochingo-monogram-black.svg" alt="m." fill className="object-contain" />
        </Link>
        <p className="font-semibold tracking-wide text-sm mb-2">SAME BRAND. BRIGHTER TOMORROW.</p>
        <p className="text-xs text-mochingo-rich-black/50 mb-8">© {new Date().getFullYear()} Mochingo. All rights reserved.</p>
        <div className="flex gap-6 text-sm font-semibold">
          <Link href="#" className="hover:opacity-70 transition-opacity">Products</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">About</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">Contact</Link>
        </div>
      </footer>
    </main>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowUpRight, Menu, X } from "lucide-react";

const nav = [
  { href: "/map", label: "Real map" },
  { href: "/network", label: "Network" },
  { href: "/journey", label: "Journey" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/business", label: "Business" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand" aria-label="Astore Lifeline home" onClick={() => setOpen(false)}>
        <span className="brand-mark" aria-hidden="true"><Activity size={17} strokeWidth={1.8}/></span>
        <span className="brand-copy"><strong>ASTORE <i>LIFELINE</i></strong><small>COMMUNITY RESILIENCE</small></span>
      </Link>
      <nav className={`main-nav ${open ? "nav-open" : ""}`} aria-label="Main navigation">
        {nav.map((item) => <Link key={item.href} href={item.href} className={`nav-link ${location === item.href ? "nav-active" : ""}`} onClick={() => setOpen(false)}>{item.label}</Link>)}
      </nav>
      <div className="header-actions">
        <span className="demo-chip"><span/> {location === "/map" ? "OPEN MAP" : "DEMO NETWORK"}</span>
        <Link className="header-cta" href="/network">Explore <ArrowUpRight size={15}/></Link>
      </div>
      <button className="mobile-menu" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>{open ? <X/> : <Menu/>}</button>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand"><span className="brand-mark"><Activity size={17}/></span><span className="brand-copy"><strong>ASTORE <i>LIFELINE</i></strong><small>COMMUNITY RESILIENCE</small></span></Link><p>See the cascade.<br/>Understand what remains connected.</p><Link href="/about" className="footer-about">How the model works <ArrowUpRight size={14}/></Link></div><div className="footer-bottom"><span>AN INDEPENDENT COMMUNITY RESILIENCE PROTOTYPE</span><span>OPEN MAP + CONCEPTUAL SIMULATIONS</span><span>PAKISTAN · 2025</span></div></footer>;
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader/><main id="main-content">{children}</main><SiteFooter/></>;
}

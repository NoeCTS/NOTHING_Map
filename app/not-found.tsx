import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell">
      <section
        className="panel"
        style={{
          margin: "120px auto 0",
          maxWidth: "640px",
          padding: "40px",
        }}
      >
        <p className="topbar-tagline">Ground Signal</p>
        <h1
          className="hero-title"
          style={{
            fontSize: "clamp(2rem, 4vw, 4rem)",
            marginTop: "12px",
            maxWidth: "none",
          }}
        >
          <span className="hero-title-line">PAGE NOT</span>
          <span className="hero-title-line hero-title-line-accent">FOUND</span>
        </h1>
        <p
          className="hero-copy"
          style={{ marginTop: "18px", maxWidth: "42ch" }}
        >
          The requested route does not exist in this prototype.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            marginTop: "22px",
            textTransform: "uppercase",
          }}
          className="btn-mode"
        >
          Return Home
        </Link>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Quantract</h1>
      <p style={{ fontSize: "1.25rem", color: "#666", marginBottom: "2rem", textAlign: "center" }}>
        Professional software for electrical contractors and building services companies.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <a
          href="https://crm.quantract.co.uk"
          style={{ padding: "0.75rem 1.5rem", backgroundColor: "#2563eb", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}
        >
          Go to CRM
        </a>
        <a
          href="https://certificates.quantract.co.uk"
          style={{ padding: "0.75rem 1.5rem", backgroundColor: "#16a34a", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}
        >
          Certificates
        </a>
      </div>
    </main>
  );
}

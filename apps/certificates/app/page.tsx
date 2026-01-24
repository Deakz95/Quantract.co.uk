export default function CertificatesPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Quantract Certificates</h1>
      <p style={{ fontSize: "1.25rem", color: "#666", marginBottom: "2rem", textAlign: "center" }}>
        Electrical installation certificates and compliance documentation.
      </p>
      <a
        href="https://crm.quantract.co.uk"
        style={{ padding: "0.75rem 1.5rem", backgroundColor: "#2563eb", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}
      >
        Back to CRM
      </a>
    </main>
  );
}

export default function ToolsPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Quantract Tools</h1>
      <p style={{ fontSize: "1.25rem", color: "#666", marginBottom: "2rem", textAlign: "center" }}>
        Utilities and tools for electrical contractors.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", maxWidth: "600px" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "0.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>Point Counter</h2>
          <p style={{ color: "#666" }}>Count electrical points from drawings.</p>
        </div>
        <div style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "0.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>Cable Calculator</h2>
          <p style={{ color: "#666" }}>Calculate cable sizes and voltage drop.</p>
        </div>
      </div>
      <a
        href="https://crm.quantract.co.uk"
        style={{ marginTop: "2rem", padding: "0.75rem 1.5rem", backgroundColor: "#2563eb", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}
      >
        Back to CRM
      </a>
    </main>
  );
}

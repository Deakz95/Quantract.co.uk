
export default function JobLayout({children}:{children:React.ReactNode}){
  return (
    <div>
      <nav style={{marginBottom:16}}>
        <a href="./">Overview</a>{" | "}
        <a href="./planner">Planner</a>{" | "}
        <a href="./costs">Costs</a>{" | "}
        <a href="./materials">Materials</a>{" | "}
        <a href="./variations">Variations</a>{" | "}
        <a href="./snags">Snags</a>
      </nav>
      {children}
    </div>
  );
}

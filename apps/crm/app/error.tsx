'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{padding:24,fontFamily:'system-ui'}}>
        <h1>Something went wrong</h1>
        <p style={{color:'#666'}}>{error?.message}</p>
        <button onClick={() => reset()} style={{padding:'8px 12px'}}>Try again</button>
      </body>
    </html>
  );
}

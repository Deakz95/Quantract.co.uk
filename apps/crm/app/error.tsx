'use client';

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{padding:24,fontFamily:'system-ui',backgroundColor:'#0f1117',color:'#fff'}}>
        <div style={{maxWidth:480,margin:'80px auto',textAlign:'center'}}>
          <h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Something went wrong</h1>
          <p style={{color:'#a0a4ae',fontSize:14,marginBottom:24}}>
            An unexpected error occurred. Please try again or return to the home page.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button
              onClick={() => reset()}
              style={{padding:'10px 16px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',cursor:'pointer',fontSize:14}}
            >
              Try again
            </button>
            <a
              href="/"
              style={{padding:'10px 16px',borderRadius:8,border:'1px solid #333',color:'#fff',textDecoration:'none',fontSize:14}}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

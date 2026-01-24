
'use client';

import { useState } from 'react';

export default function SupportPage(){
  const [messages,setMessages]=useState<any[]>([]);
  const [input,setInput]=useState('');

  async function send(){
    if(!input) return;
    const res=await fetch('/api/support/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:input})
    });
    const json=await res.json();
    setMessages(m=>[...m,{role:'user',text:input},{role:'ai',text:json.data.reply}]);
    setInput('');
  }

  return (
    <div style={{maxWidth:600}}>
      <h1>Support</h1>
      <div style={{border:'1px solid #ddd',padding:8,minHeight:300}}>
        {messages.map((m,i)=>(
          <div key={i} style={{margin:'8px 0'}}>
            <strong>{m.role}:</strong> {m.text}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} style={{flex:1}} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}

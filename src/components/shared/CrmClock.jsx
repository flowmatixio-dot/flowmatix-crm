import React from "react";

/* Analog Clock for Client CRM (cyan theme) */
export default function CrmClock({size=32}){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    const cv=ref.current;if(!cv)return;const ctx=cv.getContext("2d");const r=size/2;
    const draw=()=>{
      ctx.clearRect(0,0,size,size);const now=new Date();
      const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
      ctx.save();ctx.translate(r,r);
      // Ring
      ctx.beginPath();ctx.arc(0,0,r-1.5,0,Math.PI*2);
      ctx.strokeStyle="rgba(76,201,255,0.25)";ctx.lineWidth=1.5;ctx.stroke();
      // Hour markers
      for(let i=0;i<12;i++){const a=(i*Math.PI)/6-Math.PI/2;const main=i%3===0;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-(main?7:5)),Math.sin(a)*(r-(main?7:5)));
        ctx.lineTo(Math.cos(a)*(r-2.5),Math.sin(a)*(r-2.5));
        ctx.strokeStyle=main?"rgba(76,201,255,0.7)":"rgba(76,201,255,0.25)";ctx.lineWidth=main?1.5:0.5;ctx.stroke();}
      // Hour hand
      const hA=((h+m/60)*Math.PI)/6-Math.PI/2;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(hA)*(r*0.42),Math.sin(hA)*(r*0.42));
      ctx.strokeStyle="#4cc9ff";ctx.lineWidth=2;ctx.lineCap="round";ctx.stroke();
      // Minute hand
      const mA=((m+s/60)*Math.PI)/30-Math.PI/2;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(mA)*(r*0.62),Math.sin(mA)*(r*0.62));
      ctx.strokeStyle="rgba(76,201,255,0.7)";ctx.lineWidth=1.2;ctx.lineCap="round";ctx.stroke();
      // Second hand
      const sA=(s*Math.PI)/30-Math.PI/2;
      ctx.beginPath();ctx.moveTo(Math.cos(sA+Math.PI)*(r*0.1),Math.sin(sA+Math.PI)*(r*0.1));
      ctx.lineTo(Math.cos(sA)*(r*0.68),Math.sin(sA)*(r*0.68));
      ctx.strokeStyle="rgba(76,201,255,0.3)";ctx.lineWidth=0.5;ctx.lineCap="round";ctx.stroke();
      // Center
      ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fillStyle="#4cc9ff";ctx.fill();
      ctx.beginPath();ctx.arc(0,0,0.8,0,Math.PI*2);ctx.fillStyle="#0f1623";ctx.fill();
      ctx.restore();
    };
    draw();const iv=setInterval(draw,1000);return()=>clearInterval(iv);
  },[size]);
  return <canvas ref={ref} width={size} height={size} style={{width:size,height:size}}/>;
}

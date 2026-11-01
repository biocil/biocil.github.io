/* Phi-X interactive holography demos: hero slider, off-axis DHM (with numerical refocusing and
   aberration compensation), in-line holography (twin image) and holotomography (illumination scan).
   Everything is simulated in the visitor's browser; no data leaves the page. */
(function(){
"use strict";
var PhiX = window.PhiX = window.PhiX || {};
var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var TAU = 2*Math.PI;
/* Language: the page’s lang attribute picks English or Turkish messages. */
var LANG_TR = (document.documentElement.lang||"").toLowerCase().indexOf("tr")===0;
function L(en,tr){ return LANG_TR&&tr?tr:en; }

/* ---------- colour maps (the palette's maps come from CSS custom properties) ---------- */
var INF=[[0.0002189403691192265,0.001651004631001012,-0.01948089843709184],[0.1065134194856116,0.5639564367884091,3.932712388889277],[11.60249308247187,-3.972853965665698,-15.9423941062914],[-41.70399613139459,17.43639888205313,44.35414519872813],[77.162935699427,-33.40235894210092,-81.80730925738993],[-71.31942824499214,32.62606426397723,73.20951985803202],[25.13112622477341,-12.24266895238567,-23.07032500287172]];
function polyLUT(C){
  var lut=new Uint8ClampedArray(256*3);
  for(var i=0;i<256;i++){ var t=i/255; for(var c=0;c<3;c++){ var v=C[6][c]; for(var k=5;k>=0;k--) v=C[k][c]+t*v; lut[i*3+c]=Math.round(Math.min(1,Math.max(0,v))*255); } }
  return lut;
}
function rampLUT(st){
  var lut=new Uint8ClampedArray(256*3);
  for(var i=0;i<256;i++){
    var t=i/255,j=0; while(j<st.length-2&&t>st[j+1][0]) j++;
    var a=st[j],b=st[j+1],f=(t-a[0])/(b[0]-a[0]||1);
    for(var c=0;c<3;c++) lut[i*3+c]=Math.round(a[1][c]+(b[1][c]-a[1][c])*f);
  }
  return lut;
}
function hexRGB(h){ h=(h||"").trim().replace("#",""); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.substr(0,2),16)||0,parseInt(h.substr(2,2),16)||0,parseInt(h.substr(4,2),16)||0]; }
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function cssStops(name,fallback){
  var v=cssVar(name)||fallback;
  return v.split(",").map(function(s){ var p=s.trim().split(/\s+/); return [parseFloat(p[0]),hexRGB(p[1])]; });
}
var LUT_I=polyLUT(INF);
var LUT_P=rampLUT(cssStops("--phase-stops","0 #0B201B, 0.22 #134A3E, 0.45 #1F7A64, 0.68 #5DB89A, 0.86 #BFE8D2, 1 #F5FBF6"));
var LUT_H=rampLUT(cssStops("--holo-stops","0 #0B201B, 0.5 #8C5F12, 0.82 #E0B252, 1 #FDF3DA"));
var LUT_G=rampLUT([[0,[0,0,0]],[1,[255,255,255]]]);
/* When the visitor switches colour scheme, recompute the maps in place and let each demo repaint. */
var paletteFns=[];
document.addEventListener("phix:palette",function(){
  LUT_P.set(rampLUT(cssStops("--phase-stops","0 #000000, 1 #ffffff")));
  LUT_H.set(rampLUT(cssStops("--holo-stops","0 #000000, 1 #ffffff")));
  paletteFns.forEach(function(f){ try{ f(); }catch(e){} });
});
function lutCSS(lut,n){ var s=[]; for(var i=0;i<=n;i++){ var t=Math.round(i/n*255)*3; s.push("rgb("+lut[t]+","+lut[t+1]+","+lut[t+2]+")"); } return "linear-gradient(to right,"+s.join(",")+")"; }

/* ---------- FFT (radix 2, any power-of-two size) ---------- */
var fftCache={};
function getFFT(N){
  if(fftCache[N]) return fftCache[N];
  var LOG=Math.round(Math.log(N)/Math.LN2), rev=new Uint32Array(N), COS=new Float64Array(N/2), SIN=new Float64Array(N/2);
  for(var i=0;i<N;i++){ var r=0,v=i; for(var b=0;b<LOG;b++){ r=(r<<1)|(v&1); v>>=1; } rev[i]=r; }
  for(var k=0;k<N/2;k++){ COS[k]=Math.cos(TAU*k/N); SIN[k]=Math.sin(TAU*k/N); }
  var colR=new Float64Array(N), colI=new Float64Array(N);
  function fft1(re,im,inv){
    for(var i=0;i<N;i++){ var j=rev[i]; if(j>i){ var t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
    for(var size=2;size<=N;size<<=1){
      var half=size>>1, step=N/size;
      for(var s0=0;s0<N;s0+=size){
        for(var j2=s0,kk=0;j2<s0+half;j2++,kk+=step){
          var l=j2+half, c=COS[kk], sn=inv?SIN[kk]:-SIN[kk];
          var tr=re[l]*c-im[l]*sn, ti=re[l]*sn+im[l]*c;
          re[l]=re[j2]-tr; im[l]=im[j2]-ti; re[j2]+=tr; im[j2]+=ti;
        }
      }
    }
  }
  function fft2(re,im,inv){
    for(var r=0;r<N;r++) fft1(re.subarray(r*N,r*N+N),im.subarray(r*N,r*N+N),inv);
    for(var c=0;c<N;c++){
      for(var r2=0;r2<N;r2++){ colR[r2]=re[r2*N+c]; colI[r2]=im[r2*N+c]; }
      fft1(colR,colI,inv);
      for(var r3=0;r3<N;r3++){ re[r3*N+c]=colR[r3]; im[r3*N+c]=colI[r3]; }
    }
    if(inv){ var sc=1/(N*N); for(var q=0;q<N*N;q++){ re[q]*=sc; im[q]*=sc; } }
  }
  return (fftCache[N]={N:N,fft2:fft2,fft1:fft1});
}

/* Angular-spectrum propagator for an N×N field with pixel size dx (µm) at wavelength lambda (µm). */
function makePropagator(N,dx,lambda){
  var F=getFFT(N), fx=new Float64Array(N), inv2=1/(lambda*lambda), k0=1/lambda;
  for(var i=0;i<N;i++){ var k=i<N/2?i:i-N; fx[i]=k/(N*dx); }
  return function(re,im,z){
    if(!z) return;
    F.fft2(re,im,false);
    for(var v=0;v<N;v++){
      var fy2=fx[v]*fx[v];
      for(var u=0;u<N;u++){
        var i=v*N+u, s=inv2-fx[u]*fx[u]-fy2;
        if(s<=0){ re[i]=0; im[i]=0; continue; }
        var ph=TAU*z*(Math.sqrt(s)-k0), c=Math.cos(ph), sn=Math.sin(ph), a=re[i], b=im[i];
        re[i]=a*c-b*sn; im[i]=a*sn+b*c;
      }
    }
    F.fft2(re,im,true);
  };
}

/* Draw values into a canvas through a colour LUT. */
function paint(ctx,N,vals,lo,hi,lut){
  var img=ctx.createImageData(N,N), d=img.data, sc=255/((hi-lo)||1);
  for(var i=0;i<N*N;i++){
    var t=Math.round((vals[i]-lo)*sc); t=(t<0?0:(t>255?255:t))*3; var o=i*4;
    d[o]=lut[t]; d[o+1]=lut[t+1]; d[o+2]=lut[t+2]; d[o+3]=255;
  }
  ctx.putImageData(img,0,0);
}
function wrap(x){ return x-TAU*Math.round(x/TAU); }

/* Run fn when el comes near the viewport (or immediately without IntersectionObserver). */
function whenVisible(el,fn){
  if(!el) return;
  if(!("IntersectionObserver" in window)){ fn(); return; }
  var io=new IntersectionObserver(function(en){ if(en.some(function(x){ return x.isIntersecting; })){ io.disconnect(); fn(); } },{rootMargin:"300px"});
  io.observe(el);
}
var initFns={};

/* ---------- seeded random ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- synthetic cells ---------- */
function makeCells(W,H,count,seed,scale){
  var r=rng(seed), cells=[], tries=0;
  while(cells.length<count&&tries<count*80){
    tries++;
    var a=(0.62+r()*0.38)*scale, b=a*(0.6+r()*0.3), cx=(-0.04+r()*1.08)*W, cy=(-0.04+r()*1.08)*H, ok=true;
    for(var j=0;j<cells.length;j++){ var c0=cells[j]; if(Math.hypot(c0.cx-cx,c0.cy-cy)<0.8*(c0.a+a)){ ok=false; break; } }
    if(!ok) continue;
    var la=r()*6.283, gr=[];
    for(var g=0;g<12;g++){ var gu=(r()-0.5)*1.3, gv=(r()-0.5)*1.3; if(gu*gu+gv*gv>0.6) continue; var gs=0.05+r()*0.06; gr.push({u:gu,v:gv,s2:gs*gs,h:0.12+r()*0.2}); }
    cells.push({cx:cx,cy:cy,a:a,b:b,rot:r()*Math.PI,h:0.9+r()*0.5,hn:0.7+r()*0.3,
      nu:(r()-0.5)*0.3,nv:(r()-0.5)*0.25,nr:0.3+r()*0.08,
      hm:[[2,0.05+r()*0.08,r()*6.28],[3,0.04+r()*0.07,r()*6.28],[5,0.02+r()*0.04,r()*6.28]],
      cl:Math.cos(la),sl:Math.sin(la),ls:0.15+r()*0.3,gr:gr,
      o1u:(r()-0.5)*0.12,o1v:(r()-0.5)*0.12,o2u:(r()-0.5)*0.14,o2v:(r()-0.5)*0.14});
  }
  return cells;
}
function paintCells(phi,W,H,cells){
  for(var n=0;n<cells.length;n++){
    var c=cells[n], co=Math.cos(c.rot), si=Math.sin(c.rot), R=c.a*1.55, hm=c.hm, gr=c.gr;
    var x0=Math.max(0,Math.floor(c.cx-R)),x1=Math.min(W-1,Math.ceil(c.cx+R)),y0=Math.max(0,Math.floor(c.cy-R)),y1=Math.min(H-1,Math.ceil(c.cy+R));
    for(var y=y0;y<=y1;y++){
      var dy=y-c.cy;
      for(var x=x0;x<=x1;x++){
        var dx=x-c.cx, u=(dx*co+dy*si)/c.a, v=(-dx*si+dy*co)/c.b, r2=u*u+v*v;
        if(r2>2.4) continue;
        var th=Math.atan2(v,u), cosd=(u*c.cl+v*c.sl)/Math.sqrt(r2+1e-9);
        var m=1+hm[0][1]*Math.sin(2*th+hm[0][2])+hm[1][1]*Math.sin(3*th+hm[1][2])+hm[2][1]*Math.sin(5*th+hm[2][2])+c.ls*Math.exp((cosd-1)*7);
        var rr=r2/(m*m);
        if(rr>=1) continue;
        var val=c.h*Math.pow(1-rr,0.42);
        var du=u-c.nu, dv=(v-c.nv)/0.82, dn=(du*du+dv*dv)/(c.nr*c.nr);
        if(dn<1){
          val+=c.hn*Math.pow(1-dn,0.65);
          var e1=(du-c.o1u)*(du-c.o1u)+(dv-c.o1v)*(dv-c.o1v), e2=(du-c.o2u)*(du-c.o2u)+(dv-c.o2v)*(dv-c.o2v);
          if(e1<0.006) val+=0.3*(1-e1/0.006); if(e2<0.004) val+=0.22*(1-e2/0.004);
        } else {
          for(var g=0;g<gr.length;g++){ var G=gr[g], gu=u-G.u, gv=v-G.v, d2=gu*gu+gv*gv; if(d2<G.s2){ var q=1-d2/G.s2; val+=G.h*q*q*(1-rr); } }
        }
        phi[y*W+x]+=val;
      }
    }
  }
}
function laplacianNorm(phi,W,H,d){
  var L=new Float32Array(W*H), mx=0;
  for(var y=d;y<H-d;y++) for(var x=d;x<W-d;x++){ var i=y*W+x, l=phi[i-d]+phi[i+d]+phi[i-d*W]+phi[i+d*W]-4*phi[i]; L[i]=l; var al=Math.abs(l); if(al>mx) mx=al; }
  var sc=mx>0?2.2/mx:0;
  for(var k=0;k<W*H;k++){ var t=L[k]*sc; L[k]=t>1?1:(t<-1?-1:t); }
  return L;
}

/* ======================= HERO ======================= */
function initHero(){
var holo=document.getElementById("holo");
if(!holo) return;
var hc=document.getElementById("holoCanvas"), hctx=hc.getContext("2d");
var divider=document.getElementById("divider"), hr=document.getElementById("holoRange");
var heroImgs=null, heroPos=0.5, lastW=0, swept=false;
function buildHero(){
  var rect=holo.getBoundingClientRect(), cw=Math.round(rect.width), ch=Math.round(rect.height);
  if(cw<10||ch<10) return;
  var s=Math.min(window.devicePixelRatio||1,2), W=Math.round(cw*s), H=Math.round(ch*s);
  hc.width=W; hc.height=H; lastW=cw;
  var phi=new Float32Array(W*H);
  paintCells(phi,W,H,makeCells(W,H,11,7,Math.min(W,H)*0.16));
  /* Transparent cells: the amplitude stays almost flat and the phase does the work.
     Cell bodies delay the light by about 2–3.5 rad and nuclei by a further ~2 rad, up to about one
     fringe in total, and the fringes are wide enough on screen that their bends are easy to see. */
  var PH=2.4, PMAX=2.9*PH;
  var lap=laplacianNorm(phi,W,H,Math.max(2,Math.round(2.5*s)));
  var period=13*s, th=38*Math.PI/180, kx=TAU*Math.cos(th)/period, ky=TAU*Math.sin(th)/period;
  var nr=rng(11), hol=new ImageData(W,H), ph=new ImageData(W,H), hd=hol.data, pd=ph.data, a0=0.8, norm=1/((1+a0*1.1)*(1+a0*1.1));
  for(var y=0;y<H;y++){
    var ny=(y/H-0.5)*2;
    for(var x=0;x<W;x++){
      var i=y*W+x, p=phi[i]*PH, nx=(x/W-0.5)*2;
      var env=0.6+0.4*Math.exp(-(nx*nx*0.4+ny*ny*0.5));
      var A=a0*(1+0.08*lap[i]);
      var I=(1+A*A+2*A*Math.cos(kx*x+ky*y-p))*norm*env*1.15+(nr()-0.5)*0.04;
      var hi=Math.max(0,Math.min(255,Math.round(I*255)))*3, o=i*4;
      hd[o]=LUT_H[hi]; hd[o+1]=LUT_H[hi+1]; hd[o+2]=LUT_H[hi+2]; hd[o+3]=255;
      var t=Math.max(0,Math.min(255,Math.round((p+0.2)/PMAX*255)))*3;
      pd[o]=LUT_P[t]; pd[o+1]=LUT_P[t+1]; pd[o+2]=LUT_P[t+2]; pd[o+3]=255;
    }
  }
  var a=document.createElement("canvas"), b=document.createElement("canvas");
  a.width=b.width=W; a.height=b.height=H;
  a.getContext("2d").putImageData(hol,0,0); b.getContext("2d").putImageData(ph,0,0);
  heroImgs={holo:a,phase:b,W:W,H:H};
  drawHero();
}
function drawHero(){
  if(!heroImgs) return;
  var W=heroImgs.W,H=heroImgs.H,sx=Math.round(heroPos*W);
  hctx.drawImage(heroImgs.holo,0,0);
  if(sx>0) hctx.drawImage(heroImgs.phase,0,0,sx,H,0,0,sx,H);
  divider.style.left=(heroPos*100)+"%";
  hr.value=Math.round(heroPos*100);
  hr.setAttribute("aria-valuetext",Math.round(heroPos*100)+"% reconstructed");
}
function setPos(e){ var r=holo.getBoundingClientRect(); heroPos=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)); swept=true; drawHero(); }
holo.addEventListener("pointerdown",function(e){ holo.setPointerCapture(e.pointerId); setPos(e); });
holo.addEventListener("pointermove",function(e){ if(holo.hasPointerCapture(e.pointerId)) setPos(e); });
hr.addEventListener("input",function(){ heroPos=hr.value/100; swept=true; drawHero(); });
function sweep(){
  if(swept||reduceMotion){ if(!swept) heroPos=0.5; drawHero(); return; }
  var t0=null, from=0.985, to=0.5, dur=1700;
  function step(ts){ if(swept) return; if(t0===null) t0=ts; var k=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-k,3); heroPos=from+(to-from)*e; drawHero(); if(k<1) requestAnimationFrame(step); else swept=true; }
  heroPos=from; drawHero(); setTimeout(function(){ requestAnimationFrame(step); },350);
}
var rT=null;
if(window.ResizeObserver){ new ResizeObserver(function(){ var w=Math.round(holo.getBoundingClientRect().width); if(Math.abs(w-lastW)<4) return; clearTimeout(rT); rT=setTimeout(buildHero,160); }).observe(holo); }
buildHero(); sweep();
paletteFns.push(buildHero);
}

/* ======================= OFF-AXIS DHM ======================= */
var N=256;
function specimenPhase(kind){
  var phi=new Float32Array(N*N);
  if(kind==="cells"){ paintCells(phi,N,N,makeCells(N,N,7,23,N*0.17)); }
  else if(kind==="axons"){
    var ax=[{ang:0.22,off:-55,A:10,L:190,p:0.4,ro:11,rc:6.5},{ang:-0.35,off:22,A:7,L:150,p:2.1,ro:8,rc:4.6},{ang:1.25,off:60,A:9,L:210,p:4.0,ro:9.5,rc:5.5}];
    for(var y=0;y<N;y++) for(var x=0;x<N;x++){
      var X=x-N/2, Y=y-N/2, tot=0;
      for(var a=0;a<ax.length;a++){
        var A=ax[a], co=Math.cos(A.ang), si=Math.sin(A.ang);
        var u=X*co+Y*si, v=-X*si+Y*co-A.off;
        var f=A.A*Math.sin(2*Math.PI*u/A.L+A.p), fp=A.A*2*Math.PI/A.L*Math.cos(2*Math.PI*u/A.L+A.p);
        var d=Math.abs(v-f)/Math.sqrt(1+fp*fp);
        if(d<A.ro){
          var node=Math.abs(((u+300+A.p*20)%95)-47)<2.2; // node of Ranvier: sheath gap
          var ro=node?A.rc:A.ro;
          var lm=d<ro?2*Math.sqrt(ro*ro-d*d):0, lc=d<A.rc?2*Math.sqrt(A.rc*A.rc-d*d):0;
          tot+=0.135*(lm-lc)+0.06*lc;
        }
      }
      phi[y*N+x]=tot;
    }
  } else {
    var ss=2, add=function(x0,y0,w,h,val){ for(var y=Math.floor(y0);y<Math.ceil(y0+h);y++) for(var x=Math.floor(x0);x<Math.ceil(x0+w);x++){ if(x<0||y<0||x>=N||y>=N) continue; var cov=0; for(var sy=0;sy<ss;sy++) for(var sx=0;sx<ss;sx++){ var px=x+(sx+0.5)/ss, py=y+(sy+0.5)/ss; if(px>=x0&&px<x0+w&&py>=y0&&py<y0+h) cov++; } phi[y*N+x]+=val*cov/(ss*ss); } };
    var widths=[9,6.5,4.5,3.2,2.3], xs=20, step=1.7;
    for(var g=0;g<widths.length;g++){
      var w=widths[g], len=5*w, x0=xs, y0=24;
      for(var b=0;b<3;b++) add(x0+b*2*w,y0,w,len,step);
      for(var b2=0;b2<3;b2++) add(x0,y0+len+w*1.6+b2*2*w,len,w,step);
      xs+=6*w+8;
    }
    for(var y2=0;y2<N;y2++) for(var x2=0;x2<N;x2++){ var dx=x2-80,dy=y2-190,rr=Math.sqrt(dx*dx+dy*dy); if(rr<34) phi[y2*N+x2]+=1.2*Math.min(1,(34-rr)); var dx2=x2-185,dy2=y2-190,r2=Math.sqrt(dx2*dx2+dy2*dy2); if(r2<40) phi[y2*N+x2]+=2.4*Math.sqrt(1-(r2*r2)/(1600)); }
  }
  return phi;
}

/* ======================= INTENSITY VERSUS COMPLEX FIELD ======================= */
/* Simple separable blur used to band-limit simulated images. */
function blur(src,W,H,sigma){
  var r=Math.max(1,Math.ceil(sigma*2.5)), k=[], s=0; for(var i=-r;i<=r;i++){ var v=Math.exp(-i*i/(2*sigma*sigma)); k.push(v); s+=v; } for(var j=0;j<k.length;j++) k[j]/=s;
  var tmp=new Float64Array(W*H), out=new Float64Array(W*H);
  for(var y=0;y<H;y++) for(var x=0;x<W;x++){ var a=0; for(var t=-r;t<=r;t++){ var xx=Math.min(W-1,Math.max(0,x+t)); a+=src[y*W+xx]*k[t+r]; } tmp[y*W+x]=a; }
  for(var y2=0;y2<H;y2++) for(var x2=0;x2<W;x2++){ var b=0; for(var t2=-r;t2<=r;t2++){ var yy=Math.min(H-1,Math.max(0,y2+t2)); b+=tmp[yy*W+x2]*k[t2+r]; } out[y2*W+x2]=b; }
  return out;
}
/* Itoh unwrapping: first column down, then each row across. Works for smooth, low-noise phase. */
function unwrap2(ph,W,H){
  var u=new Float64Array(W*H);
  u[0]=ph[0];
  for(var y=1;y<H;y++) u[y*W]=u[(y-1)*W]+wrap(ph[y*W]-ph[(y-1)*W]);
  for(var y2=0;y2<H;y2++) for(var x=1;x<W;x++){ var i=y2*W+x; u[i]=u[i-1]+wrap(ph[i]-ph[i-1]); }
  return u;
}
/* Specimens for the comparison. Each returns amplitude, true phase and how to turn phase into a physical quantity. */
function fieldSample(kind){
  var amp=new Float64Array(N*N).fill(1), ph=new Float64Array(N*N), S={kind:kind,amp:amp,ph:ph};
  var lambda=0.6328;
  if(kind==="cells"){
    var p=new Float32Array(N*N); paintCells(p,N,N,makeCells(N,N,7,23,N*0.17));
    for(var i=0;i<N*N;i++){ ph[i]=p[i]; amp[i]=1-0.02*p[i]/3; }
    S.dx=0.25; S.mode="transmission"; S.dn=0.04; S.unit="µm"; S.scale=lambda/(TAU*S.dn); S.qty=L("Thickness","Kalınlık");
  } else if(kind==="beads"){
    var beads=[[60,70,26,1],[150,60,18,0],[205,120,22,1],[90,170,20,0],[175,195,28,0],[48,228,14,1],[232,40,12,0]];
    var dn=0.03, dx=0.25;
    for(var y=0;y<N;y++) for(var x=0;x<N;x++){
      var k=y*N+x;
      beads.forEach(function(b){ var r2=(x-b[0])*(x-b[0])+(y-b[1])*(y-b[1]); if(r2<b[2]*b[2]){ var tt=2*Math.sqrt(b[2]*b[2]-r2)*dx; ph[k]+=TAU*dn*tt/lambda; if(b[3]) amp[k]*=Math.exp(-0.09*tt); } });
    }
    S.dx=dx; S.mode="transmission"; S.dn=dn; S.unit="µm"; S.scale=lambda/(TAU*dn); S.qty=L("Thickness","Kalınlık");
  } else if(kind==="lens"){
    var dx2=0.5, a=20, sag=0.8, Rc=(a*a+sag*sag)/(2*sag), pitch=46, n1=0.46;
    for(var y3=0;y3<N;y3++) for(var x3=0;x3<N;x3++){
      var X=x3*dx2, Y=y3*dx2, h=0;
      for(var row=-1;row<=3;row++) for(var col=-1;col<=3;col++){
        var cx=col*pitch+(Math.abs(row)%2?pitch/2:0)+12, cy=row*pitch*0.866+14, rr=(X-cx)*(X-cx)+(Y-cy)*(Y-cy);
        if(rr<a*a){ var hh=Math.sqrt(Rc*Rc-rr)-(Rc-sag); if(hh>h) h=hh; }
      }
      ph[y3*N+x3]=TAU*n1*h/lambda;
    }
    S.dx=dx2; S.mode="transmission"; S.dn=n1; S.unit="µm"; S.scale=lambda/(TAU*n1); S.qty=L("Height","Yükseklik"); S.sag=sag; S.Rc=Rc; S.lensA=a;
  } else {
    var dx3=0.25;
    for(var y4=0;y4<N;y4++) for(var x4=0;x4<N;x4++){
      var k4=y4*N+x4, h4=0;
      if(x4>24&&x4<104&&y4>28&&y4<108) h4=50;
      if(x4>140&&x4<232&&y4>36&&y4<92) h4=120;
      var dd=((x4-176)*(x4-176)+(y4-180)*(y4-180))/(42*42); if(dd<1) h4+=220*Math.pow(1-dd,1.5);
      if(Math.abs((y4-150)-0.35*(x4-20))<2.2&&x4<120) h4-=40;
      ph[k4]=TAU*2*h4/(lambda*1000);
      if(x4>30&&x4<96&&y4>150&&y4<226) amp[k4]=0.62;      /* chromium pad: reflects less, same height */
    }
    S.dx=dx3; S.mode="reflection"; S.unit="nm"; S.scale=lambda*1000/(2*TAU); S.qty=L("Height","Yükseklik");
  }
  return S;
}
function initField(){
var root=document.getElementById("field-demo");
if(!root||root.dataset.ready) return; root.dataset.ready="1";
var $=function(id){ return document.getElementById(id); };
var intX=$("f-int").getContext("2d"), ampX=$("f-amp").getContext("2d"), phC=$("f-phase"), phX=phC.getContext("2d");
var d3C=$("f-3d"), d3X=d3C.getContext("2d"), prC=$("f-prof"), prX=prC.getContext("2d"), statusEl=$("f-status");
var D={kind:"cells",view:"unwrapped",S:null,mAmp:null,mPh:null,unw:null,qty:null,row:128,yaw:0.7,pitch:0.85,drag:null,spin:true,lo:0,hi:1};

function measure(){
  var S=fieldSample(D.kind), nr=rng(31), re=new Float64Array(N*N), im=new Float64Array(N*N);
  for(var i=0;i<N*N;i++){ re[i]=S.amp[i]*Math.cos(S.ph[i]); im[i]=S.amp[i]*Math.sin(S.ph[i]); }
  re=blur(re,N,N,0.9); im=blur(im,N,N,0.9);                    /* finite resolution */
  var a=new Float64Array(N*N), p=new Float64Array(N*N);
  for(var j=0;j<N*N;j++){
    var g1=Math.sqrt(-2*Math.log(nr()+1e-12))*Math.cos(TAU*nr()), g2=Math.sqrt(-2*Math.log(nr()+1e-12))*Math.cos(TAU*nr());
    a[j]=Math.hypot(re[j],im[j])*(1+0.012*g1); p[j]=wrap(Math.atan2(im[j],re[j])+0.03*g2);
  }
  /* incoherent bright-field image: intensity only, a little blurrier, faint edge contrast from slight defocus */
  var I=new Float64Array(N*N); for(var k=0;k<N*N;k++) I[k]=S.amp[k]*S.amp[k];
  I=blur(I,N,N,1.4);
  var lap=laplacianNorm(Float32Array.from(S.ph),N,N,2);
  for(var q=0;q<N*N;q++) I[q]=I[q]*(1+0.025*lap[q])+0.012*(nr()-0.5);
  D.S=S; D.I=I; D.mAmp=a; D.mPh=p; D.unw=unwrap2(p,N,N);
  var sorted=Array.prototype.slice.call(D.unw).sort(function(x,y){ return x-y; }), base=sorted[Math.floor(N*N*0.1)];   /* flat background as reference */
  D.qty=new Float64Array(N*N); var lo=Infinity, hi=-Infinity;
  for(var m=0;m<N*N;m++){ var v=(D.unw[m]-base)*S.scale; D.qty[m]=v; if(v<lo) lo=v; if(v>hi) hi=v; }
  D.truth=new Float64Array(N*N); for(var t=0;t<N*N;t++) D.truth[t]=S.ph[t]*S.scale;
  D.lo=lo; D.hi=hi;
  D.row=D.kind==="lens"?Math.round((14+0.866*46)/S.dx):(D.kind==="surface"?64:(D.kind==="beads"?70:128));
}
function drawMaps(){
  paint(intX,N,D.I,0,1.25,LUT_G);
  paint(ampX,N,D.mAmp,0,1.25,LUT_G);
  if(D.view==="wrapped") paint(phX,N,D.mPh,-Math.PI,Math.PI,LUT_P);
  else paint(phX,N,D.qty,D.lo,D.hi,LUT_P);
  phX.strokeStyle="rgba(255,255,255,.9)"; phX.setLineDash([4,3]); phX.lineWidth=1;
  phX.beginPath(); phX.moveTo(0,D.row+0.5); phX.lineTo(N,D.row+0.5); phX.stroke(); phX.setLineDash([]);
}
/* Line profile: measured (solid) against the true specimen (dashed). */
function drawProfile(){
  var W=prC.width, H=prC.height, padL=64, padB=40, padT=18, padR=16, row=D.row, S=D.S;
  prX.clearRect(0,0,W,H);
  var vals=[], tv=[], lo=Infinity, hi=-Infinity;
  for(var x=0;x<N;x++){ var v=D.qty[row*N+x], t=D.truth[row*N+x]; vals.push(v); tv.push(t); lo=Math.min(lo,v,t); hi=Math.max(hi,v,t); }
  var span=(hi-lo)||1; lo-=span*0.08; hi+=span*0.08;
  var X=function(i){ return padL+(W-padL-padR)*i/(N-1); }, Y=function(v){ return padT+(H-padT-padB)*(1-(v-lo)/(hi-lo)); };
  prX.strokeStyle="rgba(255,255,255,.18)"; prX.lineWidth=1; prX.fillStyle="rgba(255,255,255,.7)"; prX.font="20px Archivo, Helvetica, Arial, sans-serif";
  for(var g=0;g<=4;g++){ var vv=lo+(hi-lo)*g/4, yy=Y(vv); prX.beginPath(); prX.moveTo(padL,yy); prX.lineTo(W-padR,yy); prX.stroke(); prX.textAlign="right"; prX.fillText((S.unit==="nm"?Math.round(vv):vv.toFixed(1)),padL-8,yy+6); }
  prX.textAlign="center"; var fw=N*S.dx; for(var g2=0;g2<=4;g2++){ var xx=padL+(W-padL-padR)*g2/4; prX.fillText(Math.round(fw*g2/4)+(g2===4?" µm":""),xx,H-10); }
  prX.save(); prX.translate(18,(H-padB)/2+padT/2); prX.rotate(-Math.PI/2); prX.fillText(S.qty+" ("+S.unit+")",0,0); prX.restore();
  prX.strokeStyle="rgba(255,255,255,.55)"; prX.setLineDash([6,5]); prX.lineWidth=2; prX.beginPath();
  tv.forEach(function(v,i){ if(i) prX.lineTo(X(i),Y(v)); else prX.moveTo(X(i),Y(v)); }); prX.stroke(); prX.setLineDash([]);
  prX.strokeStyle=cssVar("--accent-on-deep")||"#E0B252"; prX.lineWidth=3; prX.beginPath();
  vals.forEach(function(v,i){ if(i) prX.lineTo(X(i),Y(v)); else prX.moveTo(X(i),Y(v)); }); prX.stroke();
}
/* 3D surface of the physical quantity, shaded, rotatable by dragging. */
var G=72, quads=null;
function draw3D(){
  var W=d3C.width, H=d3C.height, S=D.S; d3X.clearRect(0,0,W,H);
  var step=N/G, cy=Math.cos(D.yaw), sy=Math.sin(D.yaw), cp=Math.cos(D.pitch), sp=Math.sin(D.pitch);
  var zr=(D.hi-D.lo)||1, zs=0.32/zr, scale=W*0.62;
  var P=new Float64Array((G+1)*(G+1)*3), Z=new Float64Array((G+1)*(G+1));
  for(var j=0;j<=G;j++) for(var i=0;i<=G;i++){
    var sx=Math.min(N-1,Math.round(i*step)), syy=Math.min(N-1,Math.round(j*step)), h=(D.qty[syy*N+sx]-D.lo)*zs;
    var x=i/G-0.5, y=j/G-0.5, z=h;
    var x1=x*cy-y*sy, y1=x*sy+y*cy;                       /* yaw about the vertical axis */
    var y2=y1*cp-z*sp, z2=y1*sp+z*cp;                    /* pitch */
    var k=j*(G+1)+i; P[k*3]=W/2+x1*scale; P[k*3+1]=H*0.58-z2*scale*0.9+0; P[k*3+2]=y2; Z[k]=h/0.32;
  }
  if(!quads){ quads=[]; for(var q=0;q<G*G;q++) quads.push(q); }
  quads.sort(function(a,b){ var ia=(Math.floor(a/G))*(G+1)+a%G, ib=(Math.floor(b/G))*(G+1)+b%G; return P[ib*3+2]-P[ia*3+2]; });
  for(var n=0;n<quads.length;n++){
    var qq=quads[n], qi=qq%G, qj=Math.floor(qq/G), k0=qj*(G+1)+qi, k1=k0+1, k2=k0+G+2, k3=k0+G+1;
    var hz=(Z[k0]+Z[k1]+Z[k2]+Z[k3])/4, dzx=(Z[k1]-Z[k0]+Z[k2]-Z[k3])*0.5, dzy=(Z[k3]-Z[k0]+Z[k2]-Z[k1])*0.5;
    var shade=0.62+0.38*Math.max(-1,Math.min(1,(-dzx*0.6-dzy*0.4)*G*0.32*1.6+0.4));
    var t=Math.max(0,Math.min(255,Math.round(hz*255)))*3;
    d3X.fillStyle="rgb("+Math.round(LUT_P[t]*shade)+","+Math.round(LUT_P[t+1]*shade)+","+Math.round(LUT_P[t+2]*shade)+")";
    d3X.beginPath(); d3X.moveTo(P[k0*3],P[k0*3+1]); d3X.lineTo(P[k1*3],P[k1*3+1]); d3X.lineTo(P[k2*3],P[k2*3+1]); d3X.lineTo(P[k3*3],P[k3*3+1]); d3X.closePath(); d3X.fill();
  }
  d3X.fillStyle="rgba(255,255,255,.75)"; d3X.font="20px Archivo, Helvetica, Arial, sans-serif"; d3X.textAlign="left";
  d3X.fillText(S.qty+L(", vertical scale exaggerated",", düşey ölçek abartılı"),14,H-14);
}
function describe(){
  var S=D.S, msg="", v=D.qty, tr=D.truth;
  if(D.kind==="cells"){
    var mx=0; for(var i=0;i<N*N;i++) if(v[i]>mx) mx=v[i];
    msg=L("<b>Transparent cells, in transmission.</b> They absorb almost no light, so the intensity image and the amplitude are nearly blank. The phase shows them clearly: φ = 2π Δn t / λ, so with Δn ≈ 0.04 between cell and medium it converts to cell thickness, up to ","<b>Geçirgenlikte saydam hücreler.</b> Neredeyse hiç ışık soğurmazlar; bu yüzden şiddet görüntüsü ve genlik neredeyse boştur. Faz ise onları açıkça gösterir: φ = 2π Δn t / λ olduğundan, hücre ile ortam arasında Δn ≈ 0,04 alınırsa faz hücre kalınlığına dönüşür; burada en fazla ")+mx.toFixed(1)+" µm here.";
  } else if(D.kind==="beads"){
    msg=L("<b>Dyed and clear beads, in transmission.</b> Only the dyed beads absorb, so only they appear in intensity and amplitude. Every bead delays the light, so the phase shows all of them, and its value gives each bead’s thickness through φ = 2π Δn t / λ.","<b>Geçirgenlikte boyalı ve saydam boncuklar.</b> Yalnızca boyalı boncuklar soğurur; bu yüzden şiddette ve genlikte yalnızca onlar görünür. Her boncuk ışığı geciktirdiği için faz hepsini gösterir ve değeri φ = 2π Δn t / λ ile her boncuğun kalınlığını verir.");
  } else if(D.kind==="lens"){
    var cx=Math.round((46+23+12)/S.dx), cyy=Math.round((14+0.866*46)/S.dx); var peak=-Infinity; for(var y=cyy-3;y<=cyy+3;y++) for(var x=cx-3;x<=cx+3;x++) if(x>=0&&x<N&&y>=0&&y<N) peak=Math.max(peak,v[y*N+x]);
    var a=S.lensA, Rm=(a*a+peak*peak)/(2*peak);
    msg=L("<b>Microlens array, in transmission.</b> Glass lenses are transparent, so intensity says little about their shape. ","<b>Geçirgenlikte mikromercek dizisi.</b> Cam mercekler saydamdır; bu yüzden şiddet, biçimleri hakkında pek bir şey söylemez. ")+(D.view==="wrapped"?L("The phase wraps every 2π, one wavelength of optical path; switch to “Physical quantity” to unwrap it. ","Faz her 2π’de, yani bir dalga boyu optik yolda sarılır; açmak için “Fiziksel büyüklük” seçeneğine geçin. "):L("After unwrapping, the phase gives the lens profile through h = φ λ / (2π (n − 1)) with n = 1.46. ","Açıldıktan sonra faz, n = 1,46 ile h = φ λ / (2π (n − 1)) üzerinden mercek profilini verir. "))+L("Measured sag ","Ölçülen sehim ")+peak.toFixed(2)+L(" µm (true "," µm (gerçek ")+S.sag.toFixed(2)+L(" µm), radius of curvature "," µm), eğrilik yarıçapı ")+Math.round(Rm)+L(" µm (true "," µm (gerçek ")+Math.round(S.Rc)+" µm).";
  } else {
    function avg(x0,x1,y0,y1){ var s=0,n=0; for(var y=y0;y<y1;y++) for(var x=x0;x<x1;x++){ s+=v[y*N+x]; n++; } return s/n; }
    var s1=avg(40,90,40,96), s2=avg(156,220,48,82), dome=-Infinity; for(var y2=176;y2<185;y2++) for(var x2=172;x2<181;x2++) dome=Math.max(dome,v[y2*N+x2]);
    msg=L("<b>Reflective surface, in reflection.</b> Light goes down and back, so φ = 4π h / λ and one 2π wrap is only λ/2 = 316 nm of height. Intensity shows nothing of the topography, yet the phase measures the steps at ","<b>Yansımada yansıtıcı yüzey.</b> Işık gidip geri döndüğü için φ = 4π h / λ olur ve bir 2π sarılma yalnızca λ/2 = 316 nm yüksekliğe karşılık gelir. Şiddet topografiden hiçbir şey göstermez, ancak faz basamakları ")+Math.round(s1)+L(" and "," ve ")+Math.round(s2)+L(" nm (true 50 and 120) and the dome at "," nm (gerçek 50 ve 120), kubbeyi ise ")+Math.round(dome)+L(" nm (true 220). The chromium pad reflects less light, so it appears in intensity and amplitude but not in phase: the two carry independent information."," nm (gerçek 220) olarak ölçer. Krom ped daha az ışık yansıttığından şiddette ve genlikte görünür ama fazda görünmez: ikisi birbirinden bağımsız bilgi taşır.");
  }
  statusEl.innerHTML=msg;
}
function render(){ drawMaps(); drawProfile(); draw3D(); describe(); }
root.querySelectorAll("[data-fspec]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-fspec]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    D.kind=btn.getAttribute("data-fspec"); measure(); render();
  });
});
root.querySelectorAll("[data-fview]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-fview]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    D.view=btn.getAttribute("data-fview"); drawMaps(); describe();
  });
});
function setRow(e){ var r=phC.getBoundingClientRect(); D.row=Math.max(0,Math.min(N-1,Math.floor((e.clientY-r.top)/r.height*N))); drawMaps(); drawProfile(); }
phC.addEventListener("pointerdown",function(e){ phC.setPointerCapture(e.pointerId); setRow(e); });
phC.addEventListener("pointermove",function(e){ if(phC.hasPointerCapture(e.pointerId)) setRow(e); });
phC.addEventListener("keydown",function(e){ if(e.key==="ArrowUp"||e.key==="ArrowDown"){ e.preventDefault(); D.row=Math.max(0,Math.min(N-1,D.row+(e.key==="ArrowUp"?-4:4))); drawMaps(); drawProfile(); } });
d3C.addEventListener("pointerdown",function(e){ d3C.setPointerCapture(e.pointerId); D.drag=[e.clientX,e.clientY,D.yaw,D.pitch]; D.spin=false; });
d3C.addEventListener("pointermove",function(e){ if(!D.drag) return; D.yaw=D.drag[2]+(e.clientX-D.drag[0])*0.01; D.pitch=Math.max(0.25,Math.min(1.35,D.drag[3]+(e.clientY-D.drag[1])*0.008)); draw3D(); });
d3C.addEventListener("pointerup",function(){ D.drag=null; });
function spin(){ if(D.spin&&root.offsetParent!==null){ D.yaw+=0.006; draw3D(); } if(D.spin) requestAnimationFrame(spin); }
whenVisible(root,function(){ measure(); render(); if(!reduceMotion) requestAnimationFrame(spin); });
paletteFns.push(function(){ if(D.S) render(); });
}
initFns.field=initField;

/* ======================= SET-UPS ======================= */
function initSetups(){
var root=document.getElementById("setups");
if(!root||root.dataset.ready) return; root.dataset.ready="1";
var $=function(id){ return document.getElementById(id); };
var camX=$("su-cam").getContext("2d"), statusEl=$("su-status");
var U={setup:"mz",tilt:1.5,z:600,arm:"both",playing:!reduceMotion,cells:null,surf:null,inl:null,phi:0,rho:0.8,step:-1,dim:"3d",lambda:633};
PhiX.scan=U;
var prop=null, propL=0;
function camera(){
  var I=new Float64Array(N*N), nr=rng(17), lo=Infinity, hi=-Infinity, s=633/U.lambda;   /* shorter wavelength: denser fringes, more phase */
  if(U.setup==="inline"){
    if(!U.inl){
      var re=new Float64Array(N*N), im=new Float64Array(N*N), beads=[[70,80,9],[170,60,6],[120,150,12],[200,190,8],[60,200,7]];
      for(var y=0;y<N;y++) for(var x=0;x<N;x++){ var k=y*N+x, a=1, p=0; beads.forEach(function(b){ var r2=(x-b[0])*(x-b[0])+(y-b[1])*(y-b[1]); if(r2<b[2]*b[2]){ a=0.55; p=1; } }); re[k]=a*Math.cos(p); im[k]=a*Math.sin(p); }
      U.inl=[re,im];
    }
    if(!prop||propL!==U.lambda){ prop=makePropagator(N,1.12,U.lambda/1000); propL=U.lambda; }
    var r2=new Float64Array(U.inl[0]), i2=new Float64Array(U.inl[1]); prop(r2,i2,U.z);
    for(var q=0;q<N*N;q++){ I[q]=r2[q]*r2[q]+i2[q]*i2[q]+0.01*(nr()-0.5); }
  } else if(U.setup==="tomo"){
    if(!U.cells) U.cells=specimenPhase("cells");
    var fr=0.16*s, kxr=TAU*fr*Math.cos(0.7), kyr=TAU*fr*Math.sin(0.7), ill=0.07*U.rho*s, kxi=TAU*ill*Math.cos(U.phi), kyi=TAU*ill*Math.sin(U.phi);
    for(var y3=0;y3<N;y3++) for(var x3=0;x3<N;x3++){ var k3=y3*N+x3, a3=0.8; I[k3]=1+a3*a3+2*a3*Math.cos((kxr-kxi)*x3+(kyr-kyi)*y3-s*U.cells[k3])+0.04*(nr()-0.5); }
  } else {
    var ph, amp;
    if(U.setup==="mz"){ if(!U.cells) U.cells=specimenPhase("cells"); ph=U.cells; amp=null; }
    else { if(!U.surf) U.surf=fieldSample("surface"); ph=U.surf.ph; amp=U.surf.amp; }
    var f=U.tilt/3*0.22*s, th=40*Math.PI/180, kx=TAU*f*Math.cos(th), ky=TAU*f*Math.sin(th);
    for(var y2=0;y2<N;y2++) for(var x2=0;x2<N;x2++){ var k2=y2*N+x2, a2=0.8*(amp?amp[k2]:1); I[k2]=1+a2*a2+2*a2*Math.cos(kx*x2+ky*y2-s*ph[k2])+0.04*(nr()-0.5); }
  }
  for(var j=0;j<N*N;j++){ if(I[j]<lo) lo=I[j]; if(I[j]>hi) hi=I[j]; }
  paint(camX,N,I,lo,hi,LUT_G);
}
var text={
  mz:L("<b>Mach–Zehnder, in transmission.</b> A beam expander widens the laser, and a beam splitter divides it into an object arm, which passes through the sample and the microscope objective, and a reference arm. A second, slightly tilted beam splitter recombines them right in front of the camera, so the two waves overlap on the sensor at a small angle. The arms are separate, so each can be adjusted on its own; this suits transparent cells, tissue and micro-optics.","<b>Geçirgenlikte Mach–Zehnder.</b> Bir ışın genişletici lazeri genişletir; bir ışın bölücü onu numuneden ve mikroskop objektifinden geçen nesne kolu ile referans kolu olarak ikiye ayırır. Hafifçe eğik ikinci bir ışın bölücü bunları kameranın hemen önünde birleştirir; böylece iki dalga sensörde küçük bir açıyla üst üste biner. Kollar ayrı olduğundan her biri tek başına ayarlanabilir; bu düzen saydam hücreler, doku ve mikro-optikler için uygundur."),
  mi:L("<b>Michelson, in reflection.</b> One beam splitter both divides and recombines the light. The object arm goes through the tube lens and the objective to the sample surface and back, so the phase is 4π h / λ: ideal for surface topography and MEMS metrology. The reference mirror sits close to the beam splitter and the reference reaches the camera without a lens, so the mirror tilt mostly sets the angle of the reference on the camera, and with it the fringes.","<b>Yansımada Michelson.</b> Tek bir ışın bölücü ışığı hem böler hem birleştirir. Nesne kolu tüp merceğinden ve objektiften geçip numune yüzeyine gider ve geri döner; bu yüzden faz 4π h / λ olur: yüzey topografisi ve MEMS metrolojisi için idealdir. Referans aynası ışın bölücüye yakındır ve referans kameraya mercekten geçmeden ulaşır; böylece aynanın eğimi daha çok referansın kameradaki açısını, dolayısıyla saçakları belirler."),
  tomo:L("<b>Holotomography: a Mach–Zehnder with scanning illumination.</b> The fixed mirror in the object arm becomes a galvo mirror. A relay lens and the condenser image it onto the sample, so tilting the galvo tilts the plane wave at the sample without moving the lit spot. Here the beam traces a circle in the condenser pupil; the camera records one hologram per angle, and its carrier fringes turn as the illumination turns. Tab 5 shows how these holograms fill Fourier space.","<b>Holotomografi: taramalı aydınlatmalı bir Mach–Zehnder.</b> Nesne kolundaki sabit ayna galvo aynaya dönüşür. Röle merceği ve kondansör onu numune üzerine görüntüler; böylece galvo eğildiğinde numunedeki düzlem dalga eğilir ama aydınlatılan nokta yerinde kalır. Burada ışın kondansör göz bebeğinde bir daire çizer; kamera her açı için bir hologram kaydeder ve aydınlatma döndükçe taşıyıcı saçaklar da döner. Bu hologramların Fourier uzayını nasıl doldurduğunu 5. sekme gösterir."),
  inline:L("<b>In-line and lens-free.</b> No reference arm and no lenses: a partially coherent LED behind a pinhole lights the sample, which sits a millimetre or less above the image sensor. Light that passes beside the object is the reference. The field of view is the whole sensor, many millimetres wide, but the reconstruction carries the twin image.","<b>Eksen içi ve merceksiz.</b> Referans kolu ve mercek yok: iğne deliğinin arkasındaki kısmen koherent bir LED, görüntü sensörünün bir milimetre ya da daha az üstündeki numuneyi aydınlatır. Nesnenin yanından geçen ışık referans görevi görür. Görüş alanı milimetrelerce genişlikteki sensörün tamamıdır, ancak rekonstrüksiyon ikiz görüntüyü de taşır.")
};
function describe(){
  var extra="";
  if(U.setup==="mz"||U.setup==="mi") extra=U.tilt<0.15?L(" With the reference untilted, the camera shows on-axis fringes that follow the phase directly; tilt it to add the carrier that off-axis reconstruction needs."," Referans eğik değilken kamera, fazı doğrudan izleyen eksen içi saçaklar gösterir; eksen dışı rekonstrüksiyonun gerektirdiği taşıyıcıyı eklemek için eğin."):L(" The reference arrives at "," Referans, nesne dalgasına ")+U.tilt.toFixed(1)+L("° to the object wave; the tilt adds the straight carrier fringes that the sample bends.","° açıyla gelir; eğim, numunenin büktüğü düz taşıyıcı saçakları ekler.");
  else if(U.setup==="inline") extra=" z = "+U.z+L(" µm: each object casts its own diffraction rings."," µm: her nesne kendi kırınım halkalarını oluşturur.");
  extra+=L(" Wavelength "," Dalga boyu ")+U.lambda+" nm.";
  statusEl.innerHTML=text[U.setup]+extra;
}
/* ---- drawing helpers for wide beams ---- */
function pt(p){ return p[0].toFixed(1)+","+p[1].toFixed(1); }
function band(pts,w){ var s=pts.map(pt).join(" "); return '<polyline class="band" stroke-width="'+w+'" points="'+s+'"/><polyline class="flow" points="'+s+'"/>'; }
function cone(x1,x2,y,w1,w2){ return '<polygon class="cone" points="'+x1+','+(y-w1/2)+' '+x2+','+(y-w2/2)+' '+x2+','+(y+w2/2)+' '+x1+','+(y+w1/2)+'"/><polyline class="flow" points="'+x1+','+y+' '+x2+','+y+'"/>'; }
function source(y,x2,w){ return band([[86,y],[104,y]],6)+cone(104,140,y,6,w)+band([[140,y],[x2,y]],w); }
function rot(v,a){ var c=Math.cos(a), s=Math.sin(a); return [v[0]*c-v[1]*s, v[0]*s+v[1]*c]; }          /* SVG rotate(a): clockwise on screen */
function refl(d,n){ var k=2*(d[0]*n[0]+d[1]*n[1]); return [d[0]-k*n[0], d[1]-k*n[1]]; }
var R2=Math.SQRT1_2, DEG=Math.PI/180;
/* a tilted combining cube at (bx,80) turns the reference (travelling up) by twice its tilt; return where it meets the camera at camX */
function combiner(bx,a,camX){ var n=rot([R2,R2],a), o=refl([0,-1],n); return [camX, 80+o[1]/o[0]*(camX-bx)]; }
function drawBeams(){
  var g=root.querySelector('[data-beams="'+U.setup+'"]'); if(!g) return;
  var W=26, h="";
  if(U.setup==="mz"){
    var a=U.tilt*1.6*DEG, hit=combiner(520,a,582);
    $("mz-bs2").setAttribute("transform","rotate("+(a/DEG).toFixed(2)+" 520 80)");
    h='<g class="arm src">'+source(280,180,W)+'</g>'+
      '<g class="arm obj">'+band([[180,280],[180,80],[582,80]],W)+'</g>'+
      '<g class="arm ref">'+band([[180,280],[520,280],[520,80],hit],W)+'</g>';
  } else if(U.setup==="mi"){
    var am=U.tilt*0.8*DEG, n=rot([-1,0],am), back=refl([1,0],n), m=[356,230], nb=[R2,R2];
    var t=((300-m[0])*nb[0]+(230-m[1])*nb[1])/(back[0]*nb[0]+back[1]*nb[1]), b=[m[0]+back[0]*t, m[1]+back[1]*t], dn=refl(back,nb), c=[b[0]+dn[0]*(290-b[1])/dn[1], 290];
    $("mi-mirror").setAttribute("transform","rotate("+(am/DEG).toFixed(2)+" 356 230)");
    h='<g class="arm src">'+source(230,300,W)+'</g>'+
      '<g class="arm obj">'+band([[300,230],[300,74]],W)+band([[300,74],[300,290]],W)+'</g>'+
      '<g class="arm ref">'+band([[300,230],[356,230]],W)+band([m,b,c],W)+'</g>';
  } else if(U.setup==="tomo"){
    W=22;
    var u=U.rho*Math.cos(U.phi), h1=30*u, h2=-0.75*h1, hit2=combiner(530,2.5*DEG,582);
    var ray=[[180,80],[240,80+h1],[336,80+h1],[374,80],[418,80+h2],[482,80+h2],[582,80]];
    h='<g class="arm src">'+source(280,180,W)+'</g>'+
      '<g class="arm obj">'+band([[180,280],[180,80]],W)+band(ray,W)+'</g>'+
      '<g class="arm ref">'+band([[180,280],[530,280],[530,80],hit2],W)+'</g>';
    $("gt-bs2").setAttribute("transform","rotate(2.5 530 80)");
    /* law of reflection at the galvo: its normal bisects the incoming (up) and outgoing beams */
    var dx=60, dy=h1, L0=Math.hypot(dx,dy), nx=dx/L0-0, ny=dy/L0+1, nl=Math.hypot(nx,ny); nx/=nl; ny/=nl;
    $("gt-galvo").setAttribute("x1",(180-ny*17).toFixed(1)); $("gt-galvo").setAttribute("y1",(80+nx*17).toFixed(1));
    $("gt-galvo").setAttribute("x2",(180+ny*17).toFixed(1)); $("gt-galvo").setAttribute("y2",(80-nx*17).toFixed(1));
    var ux=38, uy=-h1, Lw=Math.hypot(ux,uy); ux/=Lw; uy/=Lw; var w="", t0=((performance.now()/40)%10);
    for(var k=0;k<4;k++){ var tt=6+k*10+t0; if(tt>Lw-2) continue; var cx=336+ux*tt, cy=80+h1+uy*tt; w+='<line class="wf" x1="'+(cx-uy*11).toFixed(1)+'" y1="'+(cy+ux*11).toFixed(1)+'" x2="'+(cx+uy*11).toFixed(1)+'" y2="'+(cy-ux*11).toFixed(1)+'"/>'; }
    $("gt-wave").innerHTML=w;
  }
  g.innerHTML=h;
}
function setColour(){
  var c=waveRGBjs(U.lambda), hi=c.map(function(v){ return Math.round(v+(255-v)*0.45); });
  root.style.setProperty("--beam","rgb("+c.join(",")+")"); root.style.setProperty("--beam-hi","rgb("+hi.join(",")+")");
}
function waveRGBjs(nm){
  var r=0,g=0,b=0;
  if(nm<440){ r=(440-nm)/60; b=1; } else if(nm<490){ g=(nm-440)/50; b=1; } else if(nm<510){ g=1; b=(510-nm)/20; } else if(nm<580){ r=(nm-510)/70; g=1; } else if(nm<645){ r=1; g=(645-nm)/65; } else r=1;
  var f=nm<420?0.55+0.45*(nm-380)/40:nm>680?0.55+0.45*(750-nm)/70:1;
  return [r,g,b].map(function(c){ return Math.round(255*Math.pow(Math.max(0,c*f),0.8)); });
}
function show(){
  function hide(el,h){ if(h) el.setAttribute("hidden",""); else el.removeAttribute("hidden"); }
  var use3d=U.dim==="3d"&&PhiX.setup3d;
  root.querySelectorAll("[data-setup-svg]").forEach(function(s){ hide(s,s.getAttribute("data-setup-svg")!==U.setup); });
  hide(root.querySelector(".screen.schematic"),!!use3d); hide($("su-3d"),!use3d); hide($("su-dim"),!PhiX.setup3d);
  if(PhiX.setup3d){ if(use3d) PhiX.setup3d.start(U.setup); else PhiX.setup3d.stop(); }
  hide($("su-tilt-wrap"),U.setup==="inline"||U.setup==="tomo"); hide($("su-z-wrap"),U.setup!=="inline"); hide($("su-arm-wrap"),U.setup==="inline");
  placeSample(); drawBeams(); setColour();
  if(U.setup==="tomo") galvo(true);
  root.setAttribute("data-arm",U.arm);
  $("su-note").textContent=U.setup==="tomo"?L("Schematic, not to scale. The galvo is imaged onto the sample by the relay lens and condenser, so only the illumination angle changes. Both arms carry the same laser light; use Object and Reference to pick out each arm.","Şematik, ölçekli değil. Galvo, röle merceği ve kondansörle numune üzerine görüntülenir; bu yüzden yalnızca aydınlatma açısı değişir. İki kol da aynı lazer ışığını taşır; kolları ayırt etmek için Nesne ve Referans düğmelerini kullanın."):U.setup==="inline"?L("Schematic, not to scale. Arcs are wavefronts from the pinhole; the cells scatter wavelets that interfere with the unscattered light on the sensor.","Şematik, ölçekli değil. Yaylar iğne deliğinden çıkan dalga cepheleridir; hücreler, sensörde saçılmamış ışıkla girişim yapan dalgacıklar saçar."):L("Schematic, not to scale. The expander widens the beam so that both waves overlap on the camera. Both arms carry the same laser light; use Object and Reference to pick out each arm.","Şematik, ölçekli değil. Genişletici ışını genişletir; böylece iki dalga kamerada üst üste biner. İki kol da aynı lazer ışığını taşır; kolları ayırt etmek için Nesne ve Referans düğmelerini kullanın.");
  camera(); describe();
}
root.querySelectorAll("[data-setup]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-setup]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    U.setup=btn.getAttribute("data-setup"); show();
  });
});
root.querySelectorAll("[data-arm-btn]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-arm-btn]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    U.arm=btn.getAttribute("data-arm-btn"); root.setAttribute("data-arm",U.arm);
  });
});
/* In-line: move the sample in the drawing with the sample-to-sensor distance. */
function placeSample(){
  var gap=10+(U.z-100)/1400*92, sx=530-gap-8, dx=sx-418;
  $("il-sample").setAttribute("transform","translate("+dx+" 0)");
  $("il-cone").setAttribute("points","118,180 "+sx+",40 "+sx+",320");
  $("il-coneclip").setAttribute("points","118,180 "+(sx+24)+",30 "+(sx+24)+",330");
  $("il-gapclip").setAttribute("x",sx+8); $("il-gapclip").setAttribute("width",gap);
  root.querySelectorAll("#setups .scat").forEach(function(c){ var cy=c.getAttribute("data-cy"); c.setAttribute("cx",sx+4); c.setAttribute("r",gap+12); c.style.transformOrigin=(sx+4)+"px "+cy+"px"; });
  $("il-dim1").setAttribute("x2",sx); $("il-dim1t").setAttribute("x",(118+sx)/2);
  $("il-dim2").setAttribute("x1",sx+8); $("il-dim2t").setAttribute("x",(sx+8+530)/2); $("il-dim2t").textContent="z = "+U.z+" µm";
}
/* Holotomography: the galvo traces a circle in the condenser pupil. */
function galvo(force){
  drawBeams();
  var dxp=34*U.rho*Math.sin(U.phi), dyp=34*U.rho*Math.cos(U.phi);
  $("gt-dot").setAttribute("cx",dxp.toFixed(1)); $("gt-dot").setAttribute("cy",(-dyp).toFixed(1));
  $("gt-angle").textContent="θ = "+Math.round(70*U.rho)+"°, φ = "+Math.round(((U.phi*180/Math.PI)%360+360)%360)+"°";
  if(!$("gt-trace").childElementCount) $("gt-trace").innerHTML='<circle class="trace" cx="0" cy="0" r="'+(34*U.rho)+'"/>';
  var step=Math.floor(((U.phi/TAU)%1+1)%1*32);
  if(step!==U.step||force){ U.step=step; camera(); }
}
function loop(){
  if(U.setup==="tomo"&&U.playing&&root.offsetParent!==null){ U.phi+=0.012; if(U.dim!=="3d"||!PhiX.setup3d) galvo(false); else { var st=Math.floor(((U.phi/TAU)%1+1)%1*32); if(st!==U.step){ U.step=st; camera(); } } }
  requestAnimationFrame(loop);
}
root.querySelectorAll("[data-dim]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-dim]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    U.dim=btn.getAttribute("data-dim"); show();
  });
});
PhiX.setupsShow=show;
$("su-tilt").addEventListener("input",function(){ U.tilt=+this.value; $("su-tiltOut").textContent=(+this.value).toFixed(1)+"°"; show(); });
$("su-z").addEventListener("input",function(){ U.z=+this.value; $("su-zOut").textContent=this.value+" µm"; show(); });
$("su-lambda").addEventListener("input",function(){ U.lambda=+this.value; $("su-lambdaOut").textContent=this.value+" nm"; setColour(); camera(); describe(); });
var playBtn=$("su-play");
function setPlay(p){ U.playing=p; root.classList.toggle("paused",!p); playBtn.textContent=p?L("Pause the light","Işığı durdur"):L("Play the light","Işığı oynat"); playBtn.setAttribute("aria-pressed",p?"true":"false"); }
playBtn.addEventListener("click",function(){ setPlay(!U.playing); });
setPlay(U.playing);
whenVisible(root,function(){ show(); if(!reduceMotion) requestAnimationFrame(loop); });
}
initFns.setups=initSetups;

function initOffAxis(){
var root=document.getElementById("bench");
if(!root||root.dataset.ready) return; root.dataset.ready="1";
var F=getFFT(N), DX=0.15, LAMBDA=0.6328, CURV=18, prop=makePropagator(N,DX,LAMBDA);
var B={kind:"cells",angle:45,period:5,radius:20,cu:0,cv:0,kx:0,ky:0,defocus:0,zrec:0,curv:false,comp:0,view:"phase",
  truth:null,Fre:null,Fim:null,bg:null,err:0,busy:false};
var $=function(id){ return document.getElementById(id); };
var holoC=$("holoB"), specC=$("spec"), phaseC=$("phaseB");
var holoX=holoC.getContext("2d"), specX=specC.getContext("2d"), phaseX=phaseC.getContext("2d");
var specOff=document.createElement("canvas"); specOff.width=specOff.height=N; var specOffX=specOff.getContext("2d");
var statusEl=$("status"), cbar=$("cbar"), cbarLo=$("cbarLo"), cbarHi=$("cbarHi");
var R2=new Float64Array(N*N); for(var y0=0;y0<N;y0++) for(var x0=0;x0<N;x0++){ var dx=(x0-N/2)/(N/2), dy=(y0-N/2)/(N/2); R2[y0*N+x0]=dx*dx+dy*dy; }

function carrier(){ var f=N/B.period, th=B.angle*Math.PI/180; B.kx=Math.round(f*Math.cos(th)); B.ky=Math.round(-f*Math.sin(th)); }
function snap(){ B.cu=-B.kx; B.cv=-B.ky; }

/* Simulate the camera: object wave (optionally defocused and curved by the objective) meets a tilted reference. */
function record(){
  carrier();
  var phi=B.truth, re=new Float64Array(N*N), im=new Float64Array(N*N), a0=0.8;
  for(var i=0;i<N*N;i++){ var a=a0*(1-0.03*phi[i]); re[i]=a*Math.cos(phi[i]); im[i]=a*Math.sin(phi[i]); }
  prop(re,im,B.defocus);
  if(B.curv){ for(var j=0;j<N*N;j++){ var ph=CURV*R2[j], c=Math.cos(ph), s=Math.sin(ph), a1=re[j], b1=im[j]; re[j]=a1*c-b1*s; im[j]=a1*s+b1*c; } }
  var nr=rng(5), Ire=new Float64Array(N*N), Iim=new Float64Array(N*N), lo=Infinity, hi=-Infinity;
  for(var y=0;y<N;y++) for(var x=0;x<N;x++){
    var k=y*N+x, psi=TAU*(B.kx*x+B.ky*y)/N;
    var g=Math.sqrt(-2*Math.log(nr()+1e-12))*Math.cos(TAU*nr());
    var I=1+re[k]*re[k]+im[k]*im[k]+2*(re[k]*Math.cos(psi)+im[k]*Math.sin(psi))+0.05*g;
    Ire[k]=I; if(I<lo) lo=I; if(I>hi) hi=I;
  }
  paint(holoX,N,Ire,lo,hi,LUT_G);
  F.fft2(Ire,Iim,false); B.Fre=Ire; B.Fim=Iim;
  var mag=new Float32Array(N*N), mx=0;
  for(var q=0;q<N*N;q++){ var m=Math.log(1+Math.hypot(Ire[q],Iim[q])); mag[q]=m; if(m>mx) mx=m; }
  var sImg=specOffX.createImageData(N,N), sd=sImg.data;
  for(var y2=0;y2<N;y2++) for(var x2=0;x2<N;x2++){
    var src=((y2+N/2)%N)*N+((x2+N/2)%N), t=Math.min(255,Math.round(Math.pow(mag[src]/mx,1.35)*255))*3, o=(y2*N+x2)*4;
    sd[o]=LUT_I[t]; sd[o+1]=LUT_I[t+1]; sd[o+2]=LUT_I[t+2]; sd[o+3]=255;
  }
  specOffX.putImageData(sImg,0,0);
  var bg=[]; for(var z=0;z<N*N;z+=3) if(phi[z]<0.02) bg.push(z); B.bg=bg;
}

/* Filter the chosen order, move it to the centre and return the complex camera-plane field. */
var gRe=new Float64Array(N*N), gIm=new Float64Array(N*N);
function filtered(){
  gRe.fill(0); gIm.fill(0);
  var R=B.radius, Rq=R*R;
  for(var dv=-R;dv<=R;dv++) for(var du=-R;du<=R;du++){
    if(du*du+dv*dv>Rq) continue;
    var su=((B.cu+du)%N+N)%N, sv=((B.cv+dv)%N+N)%N, s=sv*N+su, t=((dv+N)%N)*N+((du+N)%N);
    gRe[t]=B.Fre[s]; gIm[t]=B.Fim[s];
  }
  F.fft2(gRe,gIm,true);
}
function applyCurv(re,im,c){ if(!c) return; for(var j=0;j<N*N;j++){ var ph=-c*R2[j], co=Math.cos(ph), s=Math.sin(ph), a=re[j], b=im[j]; re[j]=a*co-b*s; im[j]=a*s+b*co; } }
/* Field after filtering, aberration compensation and numerical propagation to the chosen plane. */
function field(zrec,comp){
  filtered();
  var re=new Float64Array(gRe), im=new Float64Array(gIm);
  applyCurv(re,im,comp);
  prop(re,im,-zrec);
  return [re,im];
}
function ampSpread(re,im){ var s=0,s2=0,n=0; for(var i=0;i<N*N;i+=2){ var a=Math.hypot(re[i],im[i]); s+=a; s2+=a*a; n++; } var m=s/n; return Math.sqrt(Math.max(0,s2/n-m*m))/m; }

var phaseImg=null;
function reconstruct(){
  var f=field(B.zrec,B.comp), re=f[0], im=f[1], bg=B.bg, sr=0, si=0;
  for(var k=0;k<bg.length;k++){ var q=bg[k], m=Math.hypot(re[q],im[q])+1e-12; sr+=re[q]/m; si+=im[q]/m; }
  var off=Math.atan2(si,sr), truth=B.truth, vals=new Float32Array(N*N), er=0, ei=0, amax=0;
  for(var i=0;i<N*N;i++){
    var p=wrap(Math.atan2(im[i],re[i])-off), a=Math.hypot(re[i],im[i]);
    vals[i]=B.view==="phase"?p:a; if(a>amax) amax=a;
    var df=p-truth[i]; er+=Math.cos(df); ei+=Math.sin(df);
  }
  if(B.view==="phase") paint(phaseX,N,vals,-Math.PI,Math.PI,LUT_P);
  else paint(phaseX,N,vals,0,1.6,LUT_G);
  var o2=Math.atan2(ei,er), ss=0;
  for(var j=0;j<N*N;j+=2){ var e=wrap(Math.atan2(im[j],re[j])-off-truth[j]-o2); ss+=e*e; }
  B.err=Math.sqrt(ss/(N*N/2));
  drawSpec(); describe();
}
function drawSpec(){
  var S=specC.width, k=S/N;
  specX.imageSmoothingEnabled=false;
  specX.drawImage(specOff,0,0,S,S);
  var cx=(B.cu+N/2+0.5)*k, cy=(B.cv+N/2+0.5)*k;
  specX.lineWidth=3; specX.strokeStyle="#FFFFFF";
  specX.beginPath(); specX.arc(cx,cy,B.radius*k,0,TAU); specX.stroke();
  specX.strokeStyle="rgba(0,0,0,.55)"; specX.lineWidth=1.5; specX.beginPath(); specX.arc(cx,cy,B.radius*k+2.5,0,TAU); specX.stroke();
  specX.font="600 22px Archivo, Helvetica, Arial, sans-serif"; specX.textAlign="center"; specX.textBaseline="middle";
  var labels=[["+1",-B.kx,-B.ky],["0",0,0],["−1",B.kx,B.ky]];
  for(var i=0;i<labels.length;i++){
    var L=labels[i], lx=(L[1]+N/2+0.5)*k, ly=(L[2]+N/2+0.5)*k-34; if(ly<18) ly+=68;
    specX.fillStyle="rgba(0,0,0,.6)"; specX.fillRect(lx-20,ly-14,40,28);
    specX.fillStyle="#FFFFFF"; specX.fillText(L[0],lx,ly+1);
  }
}
var descT=null, note="";
function describe(){
  var dPlus=Math.hypot(B.cu+B.kx,B.cv+B.ky), dTwin=Math.hypot(B.cu-B.kx,B.cv-B.ky), dDC=Math.hypot(B.cu,B.cv), msg;
  if(note){ msg=note; }
  else if(dDC<B.radius+4) msg=L("<b>The filter overlaps the zero order.</b> Unscattered light leaks into the result and corrupts the phase. Move the circle away from the centre or make it smaller.","<b>Filtre sıfırıncı mertebeyle çakışıyor.</b> Saçılmamış ışık sonuca sızar ve fazı bozar. Daireyi merkezden uzaklaştırın ya da küçültün.");
  else if(dTwin<=1) msg=L("<b>Filter on the −1 order, the twin image.</b> It carries the complex conjugate of the object wave, so the phase comes out inverted.","<b>Filtre −1 mertebede, yani ikiz görüntüde.</b> Nesne dalgasının karmaşık eşleniğini taşır; bu yüzden faz ters çıkar.");
  else if(dPlus>1&&(dPlus<B.radius||dTwin<B.radius)) msg=L("<b>The filter is off-centre.</b> The leftover carrier shows up as tilt fringes across the phase map. Press “Centre on +1 order” to remove it.","<b>Filtre merkezde değil.</b> Kalan taşıyıcı, faz haritasında eğim saçakları olarak görünür. Gidermek için “+1 mertebeye ortala” düğmesine basın.");
  else if(dPlus>1) msg=L("<b>The filter is on empty spectrum.</b> There is little signal here, so the phase is mostly noise. Drag the circle onto one of the side orders.","<b>Filtre boş spektrumda.</b> Burada sinyal çok az; faz büyük ölçüde gürültüdür. Daireyi yan mertebelerden birine sürükleyin.");
  else if(B.curv&&Math.abs(B.comp-CURV)>1.5) msg=L("<b>The objective adds a curved phase.</b> Its rings swamp the cells. Press “Compensate aberrations” to fit and remove it numerically.","<b>Objektif eğri bir faz ekliyor.</b> Halkaları hücreleri bastırıyor. Sayısal olarak uydurup gidermek için “Aberasyonları düzelt” düğmesine basın.");
  else if(Math.abs(B.zrec-B.defocus)>1.5) msg=L("<b>The reconstruction is out of focus.</b> The sample sits ","<b>Rekonstrüksiyon odak dışında.</b> Numune odaktan ")+B.defocus+L(" µm from focus. Drag the reconstruction distance or press “Autofocus” to refocus numerically, without moving anything."," µm uzakta. Hiçbir şeyi hareket ettirmeden sayısal olarak yeniden odaklamak için rekonstrüksiyon mesafesini sürükleyin ya da “Otomatik odak” düğmesine basın.");
  else msg=L("<b>Filter centred on the +1 order","<b>Filtre +1 mertebeye ortalandı")+(B.defocus?L(", refocused",", yeniden odaklandı"):"")+(B.curv?L(" and aberration-compensated"," ve aberasyonu düzeltildi"):"")+L(".</b> This is the object wave; its phase is your measurement.",".</b> Bu nesne dalgasıdır; fazı ölçümünüzdür.");
  msg+=L(" Phase error against the true specimen: <b>"," Gerçek numuneye göre faz hatası: <b>")+B.err.toFixed(2)+L(" rad RMS</b>."," rad RMS</b>.");
  clearTimeout(descT); descT=setTimeout(function(){ statusEl.innerHTML=msg; },100);
}
var queued=false;
function schedule(){ if(queued) return; queued=true; requestAnimationFrame(function(){ queued=false; reconstruct(); }); }
function fullUpdate(snapIt){ record(); if(snapIt) snap(); reconstruct(); }

/* controls */
var outs={angle:$("angleOut"),period:$("periodOut"),radius:$("radiusOut"),defocus:$("defocusOut"),zrec:$("zrecOut")};
function syncSlider(id,val,txt){ var el=$(id); if(el) el.value=val; if(outs[id]) outs[id].textContent=txt; }
root.querySelectorAll("[data-spec]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-spec]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    B.kind=btn.getAttribute("data-spec"); B.truth=specimenPhase(B.kind); note=""; fullUpdate(true);
    holoC.setAttribute("aria-label",L("Simulated off-axis hologram of ","Benzetim eksen dışı hologram: ")+btn.textContent.toLowerCase());
  });
});
root.querySelectorAll("[data-view]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-view]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    B.view=btn.getAttribute("data-view"); setBar(); schedule();
  });
});
function setBar(){
  if(B.view==="phase"){ cbar.style.background=lutCSS(LUT_P,10); cbarLo.textContent="−π"; cbarHi.textContent=L("π rad","π rad"); }
  else { cbar.style.background=lutCSS(LUT_G,4); cbarLo.textContent="0"; cbarHi.textContent=L("amplitude","genlik"); }
}
$("angle").addEventListener("input",function(){ B.angle=+this.value; outs.angle.textContent=this.value+"°"; note=""; fullUpdate(true); });
$("period").addEventListener("input",function(){ B.period=+this.value; outs.period.textContent=(+this.value).toFixed(1)+" px"; note=""; fullUpdate(true); });
$("radius").addEventListener("input",function(){ B.radius=+this.value; outs.radius.textContent=this.value; note=""; schedule(); });
$("snap").addEventListener("click",function(){ snap(); note=""; schedule(); });
$("defocus").addEventListener("input",function(){ B.defocus=+this.value; outs.defocus.textContent=this.value+" µm"; note=""; record(); reconstruct(); });
$("zrec").addEventListener("input",function(){ B.zrec=+this.value; outs.zrec.textContent=(+this.value)+" µm"; note=""; schedule(); });
$("curv").addEventListener("change",function(){ B.curv=this.checked; B.comp=0; note=""; record(); reconstruct(); });
/* Click or drag in Fourier space to place the filter; arrow keys move it one pixel (Shift: five). */
function specPoint(e){
  var r=specC.getBoundingClientRect();
  B.cu=Math.max(-N/2,Math.min(N/2-1,Math.floor((e.clientX-r.left)/r.width*N)-N/2));
  B.cv=Math.max(-N/2,Math.min(N/2-1,Math.floor((e.clientY-r.top)/r.height*N)-N/2));
  note=""; schedule();
}
specC.addEventListener("pointerdown",function(e){ specC.setPointerCapture(e.pointerId); specPoint(e); });
specC.addEventListener("pointermove",function(e){ if(specC.hasPointerCapture(e.pointerId)) specPoint(e); });
specC.addEventListener("keydown",function(e){
  var st=e.shiftKey?5:1, used=true;
  if(e.key==="ArrowLeft") B.cu-=st; else if(e.key==="ArrowRight") B.cu+=st; else if(e.key==="ArrowUp") B.cv-=st; else if(e.key==="ArrowDown") B.cv+=st; else used=false;
  if(used){ e.preventDefault(); B.cu=Math.max(-N/2,Math.min(N/2-1,B.cu)); B.cv=Math.max(-N/2,Math.min(N/2-1,B.cv)); note=""; schedule(); }
});

/* Autofocus: sweep the reconstruction distance and keep the plane where the amplitude is flattest
   (a pure phase object shows the least amplitude contrast in focus). */
function animateSweep(values,evalFn,done){
  if(B.busy) return; B.busy=true; root.classList.add("busy");
  var i=0, best=null, results=[];
  function step(){
    var v=values[i], m=evalFn(v); results.push(m); if(best===null||m<best.m) best={v:v,m:m};
    i++;
    if(i<values.length) requestAnimationFrame(step);
    else { B.busy=false; root.classList.remove("busy"); done(best,results); }
  }
  if(reduceMotion){ for(var j=0;j<values.length;j++){ var mm=evalFn(values[j]); if(best===null||mm<best.m) best={v:values[j],m:mm}; } B.busy=false; root.classList.remove("busy"); done(best); return; }
  requestAnimationFrame(step);
}
$("autofocus").addEventListener("click",function(){
  var zs=[]; for(var z=-20;z<=20;z+=1) zs.push(z);
  animateSweep(zs,function(z){
    B.zrec=z; syncSlider("zrec",z,z+" µm");
    note=L("<b>Autofocus:</b> propagating the field to z = ","<b>Otomatik odak:</b> alan z = ")+z+L(" µm and measuring the amplitude contrast…"," µm’ye yayılıyor ve genlik kontrastı ölçülüyor…");
    reconstruct();
    var f=field(z,B.comp); return ampSpread(f[0],f[1]);
  },function(best){
    var zs2=[], z0=best.v; for(var dz=-1;dz<=1.001;dz+=0.25) zs2.push(+(z0+dz).toFixed(2));
    var fine=null; zs2.forEach(function(z){ var f=field(z,B.comp), m=ampSpread(f[0],f[1]); if(fine===null||m<fine.m) fine={v:z,m:m}; });
    B.zrec=fine.v; syncSlider("zrec",fine.v,fine.v+" µm");
    note=L("<b>Autofocus found the sharpest plane at ","<b>Otomatik odak en keskin düzlemi ")+fine.v+L(" µm</b>, where the amplitude contrast is lowest"," µm’de buldu</b>; burada genlik kontrastı en düşüktür")+(B.curv&&Math.abs(B.comp-CURV)>1.5?L(". The uncompensated curvature acts like an extra lens, so this is not the true sample position; compensate the aberration first.",". Düzeltilmemiş eğrilik ek bir mercek gibi davrandığı için bu, gerçek numune konumu değildir; önce aberasyonu düzeltin."):L(", matching the sample defocus of ","; bu, numunenin odak kaymasıyla örtüşüyor: ")+B.defocus+" µm.");
    reconstruct();
  });
});
/* Aberration compensation: fit the curvature that makes the background phase flattest. */
$("compensate").addEventListener("click",function(){
  if(!B.curv){ note=L("<b>There is no aberration to compensate.</b> Tick “Objective phase curvature” first to add the objective’s curved phase.","<b>Düzeltilecek bir aberasyon yok.</b> Objektifin eğri fazını eklemek için önce “Objektif faz eğriliği” kutusunu işaretleyin."); reconstruct(); return; }
  filtered();
  var bg=B.bg, ph=new Float64Array(bg.length);
  for(var k=0;k<bg.length;k++){ var q=bg[k]; ph[k]=Math.atan2(gIm[q],gRe[q]); }
  function flat(c){ var sr=0,si=0; for(var k=0;k<bg.length;k++){ var p=ph[k]-c*R2[bg[k]]; sr+=Math.cos(p); si+=Math.sin(p); } return -Math.hypot(sr,si)/bg.length; }
  var cs=[]; for(var c=0;c<=30;c+=1) cs.push(c);
  animateSweep(cs,function(c){ B.comp=c; note=L("<b>Fitting the curvature:</b> trying ","<b>Eğrilik uyduruluyor:</b> alan kenarında ")+c+L(" rad at the field edge…"," rad deneniyor…"); reconstruct(); return flat(c); },
  function(best){
    var b=best.v, lo=b-1, hi=b+1;
    for(var it=0;it<30;it++){ var m1=lo+(hi-lo)/3, m2=hi-(hi-lo)/3; if(flat(m1)<flat(m2)) hi=m2; else lo=m1; }
    B.comp=(lo+hi)/2;
    note=L("<b>Aberration compensated.</b> The fitted curvature is ","<b>Aberasyon düzeltildi.</b> Uydurulan eğrilik alan kenarında ")+B.comp.toFixed(1)+L(" rad at the field edge (true value "," rad (gerçek değer ")+CURV+L(" rad); its conjugate was multiplied into the field."," rad); eşleniği alanla çarpıldı.");
    reconstruct();
  });
});

whenVisible(root,function(){ B.truth=specimenPhase("cells"); setBar(); fullUpdate(true); });
paletteFns.push(function(){ if(B.truth){ setBar(); reconstruct(); } });
}
initFns.offaxis=initOffAxis;

/* ======================= IN-LINE HOLOGRAPHY ======================= */
function initInline(){
var root=document.getElementById("inline");
if(!root||root.dataset.ready) return; root.dataset.ready="1";
var M=256, DX=1.12, LAMBDA=0.532, prop=makePropagator(M,DX,LAMBDA);
var $=function(id){ return document.getElementById(id); };
var holoX=$("il-holo").getContext("2d"), recX=$("il-rec").getContext("2d"), statusEl=$("il-status");
var S={z:600,s:600,view:"amp",tRe:null,tIm:null,I:null,uRe:null,uIm:null,iter:0,busy:false};

/* The specimen: the lab's phoenix, partly absorbing and phase-shifting, plus a few small beads. */
function specimen(){
  var c=document.createElement("canvas"); c.width=c.height=M; var x=c.getContext("2d");
  x.fillStyle="#000"; x.fillRect(0,0,M,M);
  var path=document.querySelector(".brand svg path");
  x.fillStyle="#fff";
  if(path&&window.Path2D){
    var sc=150/156; x.save(); x.translate((M-150)/2,(M-125*sc)/2); x.scale(sc,sc); x.translate(-6,0);
    x.transform(1,0,0,1.00453,-140.404,-70.8801); x.fill(new Path2D(path.getAttribute("d"))); x.restore();
  } else { x.beginPath(); x.arc(M/2,M/2,45,0,TAU); x.fill(); }
  [[40,48,6],[214,60,5],[52,214,7],[206,206,4]].forEach(function(b){ x.beginPath(); x.arc(b[0],b[1],b[2],0,TAU); x.fill(); });
  var d=x.getImageData(0,0,M,M).data, re=new Float64Array(M*M), im=new Float64Array(M*M);
  for(var i=0;i<M*M;i++){ var m=d[i*4]/255, a=1-0.55*m, p=1.2*m; re[i]=a*Math.cos(p); im[i]=a*Math.sin(p); }
  S.tRe=re; S.tIm=im;
}
function record(){
  var re=new Float64Array(S.tRe), im=new Float64Array(S.tIm), nr=rng(9), I=new Float64Array(M*M), lo=Infinity, hi=-Infinity;
  prop(re,im,S.z);
  for(var i=0;i<M*M;i++){ var g=Math.sqrt(-2*Math.log(nr()+1e-12))*Math.cos(TAU*nr()); var v=Math.max(0,re[i]*re[i]+im[i]*im[i]+0.01*g); I[i]=v; if(v<lo) lo=v; if(v>hi) hi=v; }
  S.I=I; paint(holoX,M,I,lo,Math.min(hi,2.2),LUT_G);
  S.uRe=new Float64Array(M*M); S.uIm=new Float64Array(M*M);
  for(var j=0;j<M*M;j++) S.uRe[j]=Math.sqrt(I[j]);   /* the camera loses the phase: start from zero phase */
  S.iter=0;
}
function show(){
  var re=new Float64Array(S.uRe), im=new Float64Array(S.uIm), vals=new Float32Array(M*M);
  prop(re,im,-S.s);
  for(var i=0;i<M*M;i++) vals[i]=S.view==="amp"?Math.hypot(re[i],im[i]):Math.atan2(im[i],re[i]);
  if(S.view==="amp") paint(recX,M,vals,0,1.4,LUT_G); else paint(recX,M,vals,-Math.PI,Math.PI,LUT_P);
  describe();
}
function describe(){
  var msg, d=S.s-S.z;
  if(S.busy) msg=L("<b>Removing the twin image:</b> iteration ","<b>İkiz görüntü kaldırılıyor:</b> yineleme ")+S.iter+L(". Each pass keeps the measured hologram amplitude and forces the object to absorb, not amplify, light.",". Her adım ölçülen hologram genliğini korur ve nesneyi ışığı güçlendirmek yerine soğurmaya zorlar.");
  else if(S.iter>0&&Math.abs(d)<10) msg=L("<b>Twin image suppressed after ","<b>İkiz görüntü ")+S.iter+L(" iterations.</b> The phase lost by the camera has been recovered, so the out-of-focus twin no longer overlaps the object."," yinelemede bastırıldı.</b> Kameranın kaybettiği faz geri kazanıldı; odak dışı ikiz artık nesneyle çakışmıyor.");
  else if(Math.abs(d)<10) msg=L("<b>In focus, with the twin image.</b> The camera records only intensity, so back-propagation also creates the conjugate wave, which lands here ","<b>Odakta, ama ikiz görüntüyle.</b> Kamera yalnızca şiddeti kaydettiği için geri yayılım eşlenik dalgayı da üretir; bu dalga burada ")+(2*S.z)+L(" µm out of focus and surrounds the object with fringes."," µm odak dışına düşer ve nesneyi saçaklarla çevreler.");
  else if(Math.abs(S.s+S.z)<10) msg=L("<b>Focused on the twin image.</b> At the mirror-image plane the conjugate wave is sharp and the real image becomes the blurred one.","<b>İkiz görüntüye odaklandı.</b> Ayna görüntü düzleminde eşlenik dalga keskindir ve gerçek görüntü bulanık olana dönüşür.");
  else msg=L("<b>Reconstruction plane ","<b>Rekonstrüksiyon düzlemi ")+S.s+L(" µm.</b> The object is at "," µm.</b> Nesne ")+S.z+L(" µm. Drag the slider or press “Focus on the object”."," µm’de. Kaydırıcıyı sürükleyin ya da “Nesneye odakla” düğmesine basın.");
  statusEl.innerHTML=msg;
}
/* Iterative phase retrieval with physical constraints in the object plane (absorption ≥ 0, phase ≥ 0). */
function iterate(){
  var re=S.uRe, im=S.uIm, I=S.I;
  prop(re,im,-S.z);
  for(var i=0;i<M*M;i++){
    var a=Math.hypot(re[i],im[i]), p=Math.atan2(im[i],re[i]);
    if(a>1) a=1; if(p<0) p=0;
    re[i]=a*Math.cos(p); im[i]=a*Math.sin(p);
  }
  prop(re,im,S.z);
  for(var j=0;j<M*M;j++){ var m=Math.hypot(re[j],im[j])+1e-12, s=Math.sqrt(I[j])/m; re[j]*=s; im[j]*=s; }
  S.iter++;
}
var outs={z:$("il-zOut"),s:$("il-sOut")};
function setS(v){ S.s=v; $("il-s").value=v; outs.s.textContent=v+" µm"; }
$("il-z").addEventListener("input",function(){ S.z=+this.value; outs.z.textContent=this.value+" µm"; record(); setS(S.z); show(); });
$("il-s").addEventListener("input",function(){ setS(+this.value); show(); });
$("il-focus").addEventListener("click",function(){ setS(S.z); show(); });
$("il-twin").addEventListener("click",function(){ setS(-S.z); show(); });
$("il-reset").addEventListener("click",function(){ record(); setS(S.z); show(); });
$("il-remove").addEventListener("click",function(){
  if(S.busy) return; record(); setS(S.z); S.busy=true; root.classList.add("busy");
  var n=40;
  function step(){ iterate(); if(S.iter%2===0||S.iter===n){ show(); } if(S.iter<n) requestAnimationFrame(step); else { S.busy=false; root.classList.remove("busy"); show(); } }
  if(reduceMotion){ while(S.iter<n) iterate(); S.busy=false; root.classList.remove("busy"); show(); } else requestAnimationFrame(step);
});
root.querySelectorAll("[data-ilview]").forEach(function(btn){
  btn.addEventListener("click",function(){
    root.querySelectorAll("[data-ilview]").forEach(function(b){ b.setAttribute("aria-pressed",b===btn?"true":"false"); });
    S.view=btn.getAttribute("data-ilview"); show();
  });
});
whenVisible(root,function(){ specimen(); record(); setS(S.z); show(); });
paletteFns.push(function(){ if(S.I) show(); });
}
initFns.inline=initInline;

/* ======================= HOLOTOMOGRAPHY (3D) ======================= */
/* Minimal 3D projection for canvas drawings: z is up, yaw turns about z, pitch tilts the view. */
function proj(cam,S,scale,x,y,z){
  var cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
  var x1=x*cy-y*sy, y1=x*sy+y*cy, depth=y1*cp+z*sp, up=z*cp-y1*sp, f=1/(1+depth*cam.persp);
  return [S/2+x1*scale*f, S/2+cam.dy-up*scale*f, depth];
}
function orbitControls(canvas,cam,redraw){
  canvas.addEventListener("pointerdown",function(e){ canvas.setPointerCapture(e.pointerId); cam.drag=[e.clientX,e.clientY,cam.yaw,cam.pitch]; cam.auto=false; });
  canvas.addEventListener("pointermove",function(e){ if(!cam.drag) return; cam.yaw=cam.drag[2]+(e.clientX-cam.drag[0])*0.01; cam.pitch=Math.max(-0.2,Math.min(1.45,cam.drag[3]+(e.clientY-cam.drag[1])*0.008)); redraw(); });
  canvas.addEventListener("pointerup",function(){ cam.drag=null; });
  canvas.addEventListener("keydown",function(e){ var d={ArrowLeft:[-0.1,0],ArrowRight:[0.1,0],ArrowUp:[0,-0.08],ArrowDown:[0,0.08]}[e.key]; if(d){ e.preventDefault(); cam.auto=false; cam.yaw+=d[0]; cam.pitch=Math.max(-0.2,Math.min(1.45,cam.pitch+d[1])); redraw(); } });
}
function initTomo(){
var root=document.getElementById("tomo");
if(!root||root.dataset.ready) return; root.dataset.ready="1";
var Q=64, DX=0.12, L=Q*DX, LAMBDA=0.6328, NM=1.33, NAD=1.25, F=getFFT(Q), QQ=Q*Q, Q3=Q*Q*Q;
var K=NM/LAMBDA*L, KD=NAD/LAMBDA*L;                     /* Ewald radius and detection cut-off, in Fourier pixels */
var THMAX=Math.floor(Math.asin(Math.min(0.985,1.3/NM))*180/Math.PI);
var $=function(id){ return document.getElementById(id); };
var scanC=$("tomo-scan"), kC=$("tomo-k"), recC=$("tomo-rec");
var scanX=scanC.getContext("2d"), kX=kC.getContext("2d"), recX=recC.getContext("2d"), statusEl=$("tomo-status");
var accent=hexRGB(cssVar("--accent-on-deep")||"#E0B252"), soft=hexRGB(cssVar("--on-deep-soft")||"#CFE0D6");
paletteFns.push(function(){ accent=hexRGB(cssVar("--accent-on-deep")||"#E0B252"); soft=hexRGB(cssVar("--on-deep-soft")||"#CFE0D6"); if(T.Fre){ recon(); } });
var T={range:Math.min(70,THMAX),ill:[],idx:-1,single:false,playing:false,Fre:null,Fim:null,mask:null,cur:null,caps:[],truth:null,rec:null,timer:null,t:0};
var camS={yaw:0.75,pitch:0.32,persp:0.035,dy:20,auto:true}, camK={yaw:0.75,pitch:0.32,persp:0.006,dy:10,auto:true};
var ZD=Math.round(0.65/DX);                             /* plane of the upper lipid droplet */
var sec={};

/* A cell in 3D: body, nucleus, nucleolus, lipid droplets (two stacked along z), refractive index contrast Δn. */
var drops=[[1.6,0,0.65,0.28],[1.6,0,-0.65,0.28],[-2.1,1.0,0.35,0.22]];
function dn(x,y,z){
  var v=0, e=(x*x)/9+(y*y)/5.76+(z*z)/2.25; if(e<1) v+=0.012;
  var en=((x+0.6)*(x+0.6))/1.44+(y*y)/1.0+(z*z)/0.64; if(en<1) v+=0.010;
  if((x+0.8)*(x+0.8)+(y-0.1)*(y-0.1)+z*z<0.0625) v+=0.010;
  for(var i=0;i<drops.length;i++){ var d=drops[i]; if((x-d[0])*(x-d[0])+(y-d[1])*(y-d[1])+(z-d[2])*(z-d[2])<d[3]*d[3]) v+=(i<2?0.06:0.05); }
  return v;
}
function build(){
  var re=new Float64Array(Q3), im=new Float64Array(Q3);
  for(var iz=0;iz<Q;iz++) for(var iy=0;iy<Q;iy++) for(var ix=0;ix<Q;ix++){
    var s=0; for(var a=0;a<2;a++) for(var b=0;b<2;b++) for(var c=0;c<2;c++) s+=dn((ix+0.25+0.5*a-Q/2)*DX,(iy+0.25+0.5*b-Q/2)*DX,(iz+0.25+0.5*c-Q/2)*DX);
    re[(iz*Q+iy)*Q+ix]=s/8;
  }
  T.truth=new Float64Array(re);
  fft3(re,im,false); T.Fre=re; T.Fim=im;
}
var lr=new Float64Array(Q), li=new Float64Array(Q);
function fft3(re,im,inv){
  for(var z=0;z<Q;z++) F.fft2(re.subarray(z*QQ,(z+1)*QQ),im.subarray(z*QQ,(z+1)*QQ),inv);
  for(var y=0;y<Q;y++) for(var x=0;x<Q;x++){
    for(var z1=0;z1<Q;z1++){ lr[z1]=re[z1*QQ+y*Q+x]; li[z1]=im[z1*QQ+y*Q+x]; }
    F.fft1(lr,li,inv);
    var sc=inv?1/Q:1; for(var z2=0;z2<Q;z2++){ re[z2*QQ+y*Q+x]=lr[z2]*sc; im[z2*QQ+y*Q+x]=li[z2]*sc; }
  }
}
/* Illumination pattern: normal incidence, then rings at half and full angle in the condenser pupil. */
function setIll(){
  T.ill=[[0,0]];
  if(T.range>0){ for(var a=0;a<16;a++) T.ill.push([T.range/2,a*22.5]); for(var b=0;b<32;b++) T.ill.push([T.range,b*11.25]); }
}
function kin(i){ var th=T.ill[i][0]*Math.PI/180, ph=T.ill[i][1]*Math.PI/180; return [K*Math.sin(th)*Math.cos(ph),K*Math.sin(th)*Math.sin(ph),K*Math.cos(th)]; }
/* Fourier diffraction theorem: the detected cap of the Ewald sphere, shifted by −k_in. One cap per angle, no conjugate. */
function cap(i,step,cb){
  var k=kin(i);
  for(var ky=-KD;ky<=KD;ky+=step) for(var kx=-KD;kx<=KD;kx+=step){
    var r2=kx*kx+ky*ky; if(r2>KD*KD) continue;
    cb(kx-k[0],ky-k[1],Math.sqrt(K*K-r2)-k[2]);
  }
}
function vidx(u,v,w){ u=Math.round(u); v=Math.round(v); w=Math.round(w); return (((w%Q)+Q)%Q)*QQ+(((v%Q)+Q)%Q)*Q+(((u%Q)+Q)%Q); }
function reset(){ stop(); T.mask=new Uint8Array(Q3); T.idx=-1; T.cur=null; T.caps=[]; recon(); describe(); drawK(); drawScan(); }
function addAngle(i){
  T.idx=i; var cur=new Uint8Array(Q3), pts=[];
  cap(i,0.4,function(u,v,w){ var k=vidx(u,v,w); T.mask[k]=1; cur[k]=1; });
  cap(i,1.6,function(u,v,w){ pts.push(u,v,w); });
  T.cur=cur; T.caps.push(Float32Array.from(pts)); recon();
}
function recon(){
  var m=T.single&&T.cur?T.cur:T.mask, re=new Float64Array(Q3), im=new Float64Array(Q3), any=false;
  for(var i=0;i<Q3;i++) if(m&&m[i]){ re[i]=T.Fre[i]; im[i]=T.Fim[i]; any=true; }
  if(any) fft3(re,im,true);
  T.rec=any?re:null; drawRec();
}
function slice(vol,kind){
  var out=new Float64Array(QQ);
  for(var a=0;a<Q;a++) for(var b=0;b<Q;b++){
    out[(Q-1-a)*Q+b]=kind==="xz"?vol[a*QQ+(Q/2)*Q+b]:vol[(Q/2+ZD)*QQ+a*Q+b];   /* x–z: z up; x–y at the upper droplet */
  }
  return out;
}
function drawRec(){
  var S=recC.width, cell=Math.floor((S-60)/2), ox=[30,30+cell+10], oy=[44,44+cell+40];
  recX.clearRect(0,0,S,S);
  var tz=slice(T.truth,"xz"), ty=slice(T.truth,"xy"), hiT=0.075;
  var rz=T.rec?slice(T.rec,"xz"):null, ry=T.rec?slice(T.rec,"xy"):null, hiR=1e-9;
  if(rz){ for(var i=0;i<QQ;i++){ hiR=Math.max(hiR,rz[i],ry[i]); } }
  var c=document.createElement("canvas"); c.width=c.height=Q; var cx=c.getContext("2d");
  function put(vals,lo,hi,x,y){ paint(cx,Q,vals,lo,hi,LUT_P); recX.imageSmoothingEnabled=true; recX.drawImage(c,x,y,cell,cell); }
  put(tz,0,hiT,ox[0],oy[0]); put(ty,0,hiT,ox[1],oy[0]);
  if(rz){ put(rz,-0.12*hiR,0.9*hiR,ox[0],oy[1]); put(ry,-0.12*hiR,0.9*hiR,ox[1],oy[1]); }
  else { recX.fillStyle="rgba(255,255,255,.06)"; recX.fillRect(ox[0],oy[1],cell,cell); recX.fillRect(ox[1],oy[1],cell,cell); }
  recX.fillStyle="rgba(255,255,255,.8)"; recX.font="600 18px Archivo, Helvetica, Arial, sans-serif"; recX.textAlign="left";
  recX.fillText(L("True, x–z","Gerçek, x–z"),ox[0],oy[0]-12); recX.fillText(L("True, x–y","Gerçek, x–y"),ox[1],oy[0]-12);
  var lab=T.single&&T.cur?L("one angle","tek açı"):(T.idx<0?L("no data yet","henüz veri yok"):(T.idx+1)+" of "+T.ill.length+L(" angles"," açı"));
  recX.fillText(L("Reconstructed, x–z","Rekonstrükte, x–z"),ox[0],oy[1]-12); recX.fillText(L("x–y (","x–y (")+lab+")",ox[1],oy[1]-12);
}
/* Panel 1: the cell in 3D, the condenser and objective cones, and the tilted plane wave. */
function line3(ctx,cam,S,sc,pts,stroke,w){ ctx.strokeStyle=stroke; ctx.lineWidth=w||1.5; ctx.beginPath(); for(var i=0;i<pts.length;i++){ var p=proj(cam,S,sc,pts[i][0],pts[i][1],pts[i][2]); if(i) ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]); } ctx.stroke(); }
function ellipsoid(ctx,cam,S,sc,c,a,stroke){
  for(var lat=-60;lat<=60;lat+=30){ var pts=[], t=lat*Math.PI/180; for(var g=0;g<=48;g++){ var ph=g/48*TAU; pts.push([c[0]+a[0]*Math.cos(t)*Math.cos(ph),c[1]+a[1]*Math.cos(t)*Math.sin(ph),c[2]+a[2]*Math.sin(t)]); } line3(ctx,cam,S,sc,pts,stroke,1.2); }
  for(var lo=0;lo<180;lo+=30){ var p2=[], q=lo*Math.PI/180; for(var g2=0;g2<=48;g2++){ var t2=g2/48*TAU; p2.push([c[0]+a[0]*Math.cos(t2)*Math.cos(q),c[1]+a[1]*Math.cos(t2)*Math.sin(q),c[2]+a[2]*Math.sin(t2)]); } line3(ctx,cam,S,sc,p2,stroke,1.2); }
}
function rgba(c,a){ return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"; }
function drawScan(){
  var S=scanC.width, sc=S/15, x=scanX; x.clearRect(0,0,S,S);
  var i=Math.max(0,T.idx), th=T.ill.length?T.ill[i][0]*Math.PI/180:0, ph=T.ill.length?T.ill[i][1]*Math.PI/180:0;
  var kd=[Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)];
  /* direction hemisphere below the sample, with every illumination used so far */
  var R=5.2; for(var lat=0;lat<=60;lat+=30){ var p=[], t=lat*Math.PI/180; for(var g=0;g<=60;g++){ var a=g/60*TAU; p.push([R*Math.sin(Math.PI/2-t)*Math.cos(a),R*Math.sin(Math.PI/2-t)*Math.sin(a),-R*Math.cos(Math.PI/2-t)]); } line3(x,camS,S,sc,p,"rgba(255,255,255,.12)",1); }
  for(var j=0;j<=T.idx&&j<T.ill.length;j++){ var tj=T.ill[j][0]*Math.PI/180, pj=T.ill[j][1]*Math.PI/180, q=proj(camS,S,sc,-R*Math.sin(tj)*Math.cos(pj),-R*Math.sin(tj)*Math.sin(pj),-R*Math.cos(tj)); x.fillStyle=j===T.idx?"#fff":rgba(accent,0.85); x.beginPath(); x.arc(q[0],q[1],j===T.idx?5:3,0,TAU); x.fill(); }
  /* objective cone (detection NA) above */
  var na=Math.asin(NAD/NM), h=4.2, rr=h*Math.tan(na)*0.55, top=[]; for(var g3=0;g3<=48;g3++){ var a3=g3/48*TAU; top.push([rr*Math.cos(a3),rr*Math.sin(a3),h]); } line3(x,camS,S,sc,top,"rgba(255,255,255,.25)",1.2);
  [0,1,2,3].forEach(function(n){ var a4=n*Math.PI/2+0.4; line3(x,camS,S,sc,[[0,0,0],[rr*Math.cos(a4),rr*Math.sin(a4),h]],"rgba(255,255,255,.18)",1); });
  /* the cell */
  ellipsoid(x,camS,S,sc,[0,0,0],[3,2.4,1.5],rgba(soft,0.35));
  ellipsoid(x,camS,S,sc,[-0.6,0,0],[1.2,1.0,0.8],rgba(soft,0.55));
  drops.forEach(function(d){ var q=proj(camS,S,sc,d[0],d[1],d[2]); x.fillStyle=rgba(accent,1); x.beginPath(); x.arc(q[0],q[1],Math.max(3,d[3]*sc*0.9),0,TAU); x.fill(); });
  /* plane wavefronts travelling along k_in */
  var u=Math.abs(kd[2])>0.9?[1,0,0]:[0,0,1], e1=[kd[1]*u[2]-kd[2]*u[1],kd[2]*u[0]-kd[0]*u[2],kd[0]*u[1]-kd[1]*u[0]], n1=Math.hypot(e1[0],e1[1],e1[2]); e1=[e1[0]/n1,e1[1]/n1,e1[2]/n1];
  var e2=[kd[1]*e1[2]-kd[2]*e1[1],kd[2]*e1[0]-kd[0]*e1[2],kd[0]*e1[1]-kd[1]*e1[0]], hw=2.6;
  for(var n=0;n<4;n++){
    var s=-6.2+((T.t*0.9+n*1.25)%5), al=Math.max(0,0.32-Math.abs(s+3.7)*0.06);
    var cx=kd[0]*s, cy=kd[1]*s, cz=kd[2]*s, corners=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(function(c){ return [cx+(c[0]*e1[0]+c[1]*e2[0])*hw,cy+(c[0]*e1[1]+c[1]*e2[1])*hw,cz+(c[0]*e1[2]+c[1]*e2[2])*hw]; });
    x.fillStyle=rgba(accent,al*0.45); x.beginPath(); corners.forEach(function(c,k){ var q=proj(camS,S,sc,c[0],c[1],c[2]); if(k) x.lineTo(q[0],q[1]); else x.moveTo(q[0],q[1]); }); x.fill();
    line3(x,camS,S,sc,corners,rgba(accent,al*1.6),1.2);
  }
  line3(x,camS,S,sc,[[-kd[0]*6,-kd[1]*6,-kd[2]*6],[-kd[0]*2.2,-kd[1]*2.2,-kd[2]*2.2]],"#fff",3);
  var tip=proj(camS,S,sc,-kd[0]*2.2,-kd[1]*2.2,-kd[2]*2.2); x.fillStyle="#fff"; x.beginPath(); x.arc(tip[0],tip[1],5,0,TAU); x.fill();
  label3(x,"θ = "+Math.round(T.ill.length?T.ill[i][0]:0)+"°, φ = "+Math.round(T.ill.length?T.ill[i][1]:0)+"°");
}
function label3(ctx,txt){ ctx.font="600 20px Archivo, Helvetica, Arial, sans-serif"; var w=ctx.measureText(txt).width+20; ctx.fillStyle="rgba(0,0,0,.5)"; ctx.fillRect(10,10,w,32); ctx.fillStyle="#fff"; ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText(txt,20,27); ctx.textBaseline="alphabetic"; }
/* Panel 2: Fourier space in 3D: every cap so far, the current cap in white and its Ewald sphere. */
function drawK(){
  var S=kC.width, sc=S/80, x=kX; x.clearRect(0,0,S,S);
  var A=30; [[[-A,0,0],[A,0,0],"kx"],[[0,-A,0],[0,A,0],"ky"],[[0,0,-A*0.6],[0,0,A*0.6],"kz"]].forEach(function(ax){ line3(x,camK,S,sc,[ax[0],ax[1]],"rgba(255,255,255,.3)",1.2); var p=proj(camK,S,sc,ax[1][0]*1.08,ax[1][1]*1.08,ax[1][2]*1.12); x.fillStyle="rgba(255,255,255,.8)"; x.font="600 18px Archivo, Helvetica, Arial, sans-serif"; x.textAlign="center"; x.fillText(ax[2],p[0],p[1]); });
  var all=[];
  for(var c=0;c<T.caps.length;c++){ var arr=T.caps[c], cur=(c===T.caps.length-1); if(T.single&&!cur) continue; for(var j=0;j<arr.length;j+=3){ var p=proj(camK,S,sc,arr[j],arr[j+1],arr[j+2]); all.push(p[0],p[1],p[2],cur?1:0); } }
  for(var k=0;k<all.length;k+=4){ var d=all[k+2], f=Math.max(0.25,Math.min(1,0.65-d/70)); if(all[k+3]){ x.fillStyle="rgba(255,255,255,"+f+")"; x.fillRect(all[k]-1.6,all[k+1]-1.6,3.2,3.2); } else { x.fillStyle=rgba(accent,f*0.75); x.fillRect(all[k]-1.2,all[k+1]-1.2,2.4,2.4); } }
  if(T.idx>=0&&!T.single){
    var kk=kin(T.idx), ring=[]; for(var g=0;g<=72;g++){ var a=g/72*TAU; ring.push([-kk[0]+K*Math.cos(a),-kk[1]+K*Math.sin(a),-kk[2]]); }
    line3(x,camK,S,sc,ring,"rgba(255,255,255,.18)",1);
    var mer=[]; for(var g2=0;g2<=72;g2++){ var b=g2/72*TAU; mer.push([-kk[0]+K*Math.cos(b),-kk[1],-kk[2]+K*Math.sin(b)]); } line3(x,camK,S,sc,mer,"rgba(255,255,255,.18)",1);
    line3(x,camK,S,sc,[[-kk[0],-kk[1],-kk[2]],[0,0,0]],"#fff",2);
  }
  label3(x,T.single?L("one cap","tek kapak"):(T.caps.length+L(" caps"," kapak")));
}
function describe(){
  var msg;
  if(T.idx<0) msg=L("<b>Press “Scan the illumination”.</b> The beam steps through normal incidence and two rings in the condenser pupil, up to ","<b>“Aydınlatmayı tara” düğmesine basın.</b> Işın önce dik gelişten, sonra kondansör göz bebeğindeki iki halka boyunca ")+T.range+L("°. Each angle adds one cap of the Ewald sphere to Fourier space.","°’ye kadar ilerler. Her açı Fourier uzayına Ewald küresinden bir kapak ekler.");
  else if(T.ill.length===1) msg=L("<b>No illumination scan.</b> With the beam fixed at normal incidence, a single cap carries almost no information along z: the x–z section smears into vertical streaks and the two droplets merge. Widen the illumination range and scan again.","<b>Aydınlatma taraması yok.</b> Işın dik gelişte sabitken tek bir kapak z boyunca neredeyse hiç bilgi taşımaz: x–z kesiti dikey çizgilere yayılır ve iki damlacık birleşir. Aydınlatma aralığını genişletip yeniden tarayın.");
  else if(T.single) msg=L("<b>One angle alone</b> fills a single cap. The section smears out along the illumination direction, and the two lipid droplets on the right can no longer be told apart along z.","<b>Tek bir açı</b> yalnızca bir kapağı doldurur. Kesit aydınlatma yönü boyunca bulanıklaşır ve sağdaki iki lipit damlacığı z boyunca artık ayırt edilemez.");
  else if(T.idx<T.ill.length-1) msg=L("<b>Angle ","<b>Açı ")+(T.idx+1)+" of "+T.ill.length+" (θ = "+Math.round(T.ill[T.idx][0])+L("°).</b> Each cap is the Ewald sphere for that illumination, shifted by −k<sub>in</sub>. As the caps accumulate, the filled volume grows along kz and the section sharpens along z.","°).</b> Her kapak, o aydınlatma için −k<sub>in</sub> kadar kaydırılmış Ewald küresidir. Kapaklar biriktikçe dolan hacim kz boyunca büyür ve kesit z boyunca keskinleşir.");
  else msg=L("<b>Synthesis complete.</b> ","<b>Sentez tamamlandı.</b> ")+T.ill.length+L(" caps fill a volume of Fourier space; its extent along kz sets the axial resolution, so the droplets 1.3 µm apart along z now separate. The empty cone around the kz axis is the missing cone, which is why the reconstruction is still slightly elongated along z."," kapak Fourier uzayında bir hacmi doldurur; bu hacmin kz boyunca genişliği eksenel çözünürlüğü belirler, böylece z boyunca 1,3 µm aralıklı damlacıklar artık ayrılır. kz ekseni çevresindeki boş koni eksik konidir; rekonstrüksiyonun z boyunca hâlâ biraz uzamış olmasının nedeni budur.");
  statusEl.innerHTML=msg;
}
var looping=false;
function loop(){
  var visible=root.offsetParent!==null;
  if(visible){ T.t+=0.03; if(camS.auto&&!reduceMotion) camS.yaw+=0.004; if(camK.auto&&!reduceMotion) camK.yaw+=0.004; drawScan(); drawK(); }
  requestAnimationFrame(loop);
}
function play(){
  if(T.playing){ stop(); return; }
  if(T.idx>=T.ill.length-1){ T.mask=new Uint8Array(Q3); T.idx=-1; T.caps=[]; }
  T.playing=true; $("tomo-play").textContent=L("Pause","Duraklat");
  T.timer=setInterval(function(){
    if(T.idx>=T.ill.length-1){ stop(); describe(); return; }
    addAngle(T.idx+1); describe();
  },150);
}
function stop(){ T.playing=false; clearInterval(T.timer); var b=$("tomo-play"); if(b) b.textContent=T.idx>=0&&T.idx<T.ill.length-1?L("Resume scan","Taramaya devam et"):L("Scan the illumination","Aydınlatmayı tara"); }
function finish(){ for(var i=T.idx+1;i<T.ill.length;i++) addAngle(i); describe(); stop(); drawScan(); drawK(); }
$("tomo-play").addEventListener("click",play);
$("tomo-reset").addEventListener("click",function(){ reset(); });
$("tomo-range").addEventListener("input",function(){ T.range=+this.value; $("tomo-rangeOut").textContent=this.value+"°"; setIll(); reset(); });
$("tomo-single").addEventListener("change",function(){ T.single=this.checked; recon(); describe(); drawK(); });
$("tomo-range").max=THMAX; $("tomo-range").value=T.range; $("tomo-rangeOut").textContent=T.range+"°";
orbitControls(scanC,camS,drawScan); orbitControls(kC,camK,drawK);
whenVisible(root,function(){
  if(PhiX.tomo3dActive) return;
  build(); setIll(); T.mask=new Uint8Array(Q3); recon(); drawScan(); drawK(); describe();
  if(!looping){ looping=true; requestAnimationFrame(loop); }
  if(reduceMotion) finish(); else setTimeout(play,500);
});
}
initFns.tomo=initTomo; PhiX.initTomoClassic=initTomo;

/* ======================= TABS AND START-UP ======================= */
function initTabs(){
  document.querySelectorAll("[data-demo-tabs]").forEach(function(box){
    var tabs=Array.prototype.slice.call(box.querySelectorAll("[role=tab]"));
    function select(tab,focus){
      tabs.forEach(function(t){
        var on=t===tab, panel=document.getElementById(t.getAttribute("aria-controls"));
        t.setAttribute("aria-selected",on?"true":"false"); t.tabIndex=on?0:-1; panel.hidden=!on;
      });
      if(focus) tab.focus();
      var fn=initFns[tab.getAttribute("data-demo")]; if(fn) fn();
    }
    tabs.forEach(function(t,i){
      t.addEventListener("click",function(){ select(t,false); });
      t.addEventListener("keydown",function(e){
        var j=null; if(e.key==="ArrowRight") j=(i+1)%tabs.length; else if(e.key==="ArrowLeft") j=(i-1+tabs.length)%tabs.length; else if(e.key==="Home") j=0; else if(e.key==="End") j=tabs.length-1;
        if(j!==null){ e.preventDefault(); select(tabs[j],true); }
      });
    });
    var want=location.hash.replace("#","");
    tabs.forEach(function(t){ if(t.getAttribute("data-demo")===want){ select(t,false); } });
  });
}
PhiX.getFFT=getFFT; PhiX.LUT_P=LUT_P; PhiX.hexRGB=hexRGB; PhiX.cssVar=cssVar; PhiX.whenVisible=whenVisible;
PhiX.reduceMotion=reduceMotion; PhiX.initFns=initFns; PhiX.paint=paint;
initHero();
initTabs();
initField();
initSetups();
initOffAxis();
initInline();
initTomo();
})();

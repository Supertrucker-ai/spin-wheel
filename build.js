// Build: concatenates parts/* into src.html, renders the home-screen icon from the game's own drawing code, embeds icon + manifest into index.html
const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const dir=__dirname,P=f=>fs.readFileSync(path.join(dir,'parts',f),'utf8');
const EXE=process.env.CHROME||'/usr/bin/google-chrome';
(async()=>{
  const js=['store.js','colors.js','wheel.js','fx.js','board.js','app.js'].map(P).join('\n');
  const src=P('head.html')+P('body.html')+"(function(){\n'use strict';\n"+js+"\n})();\n</script>\n</body>\n</html>\n";
  fs.writeFileSync(path.join(dir,'src.html'),src);
  const tmp=path.join(dir,'.tmp-build.html');
  fs.writeFileSync(tmp,src.replace(/%%ICON%%/g,'data:,').replace(/%%MANIFEST%%/g,'data:,'));
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+tmp);const url=await p.evaluate(()=>window.__SW.icon());
  await b.close();fs.unlinkSync(tmp);
  if(errs.length){console.error('BUILD ERRORS',errs);process.exit(1)}
  const png=Buffer.from(url.split(',')[1],'base64');
  fs.writeFileSync(path.join(dir,'apple-touch-icon.png'),png);
  const manifest={name:'Spin the Wheel',short_name:'Spin Wheel',display:'standalone',orientation:'portrait',background_color:'#1b1250',theme_color:'#1b1250',icons:[{src:url,sizes:'180x180',type:'image/png'}]};
  const out=src.replace(/%%ICON%%/g,url).replace(/%%MANIFEST%%/g,'data:application/manifest+json,'+encodeURIComponent(JSON.stringify(manifest)));
  fs.writeFileSync(path.join(dir,'index.html'),out);console.log('index.html',out.length,'bytes');
})();

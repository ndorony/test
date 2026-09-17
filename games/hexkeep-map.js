(function(g){
 'use strict';
 // Pointy KayKit hexes. A tiled apron continues beyond the camera crop.
 const tiles=Array.from({length:48},(_,id)=>({id,c:id%8,r:Math.floor(id/8),role:'grass'}));
 // Original winding route: forest bend, crossing, south loop, north hairpin.
 const path=[32,33,25,18,19,20,28,36,37,29,22,23,31,39];
 path.forEach(id=>tiles[id].role='road');
 [4,11,26,34].forEach(id=>tiles[id].role='river');tiles[41].role='water';tiles[19].role='bridge';
 [0,1,5,6,7,8,9,15,16,17,40,43,44,45].forEach(id=>tiles[id].role='forest');
 [2,42].forEach(id=>tiles[id].role='hill');tiles[47].role='village';tiles[46].role='village';tiles[39].role='entrance';
 const village=47;
 const sites=[{tile:30,name:'תצפית הכפר',rally:11},{tile:10,name:'האחו הגבוה',rally:3},{tile:21,name:'סדנת המעבר',rally:9},{tile:38,name:'כיכר הכפר',rally:12},{tile:24,name:'שולי היער',rally:2},{tile:35,name:'גבעת המעבר',rally:6}];
 sites.forEach(s=>{if(!s.barricade)tiles[s.tile].role='build';});
 const apron=[];
 for(let r=-8;r<14;r++)for(let c=-8;c<16;c++)if(r<0||r>=6||c<0||c>=8){let role='grass';if((c*17+r*11+400)%7<3)role='forest';if(c===4-Math.ceil(r/2))role='river';if(r===4&&c<0)role='road';apron.push({id:'edge-'+c+'-'+r,c,r,role});}
 function cellWorld(t){return {x:t.c*2+(Math.abs(t.r)%2)-7.5,z:t.r*Math.sqrt(3)-4.33};}
 function world(id){return cellWorld(tiles[id]);}
 function distance(a,b){const x=tiles[a],y=tiles[b],aq=x.c-Math.floor(x.r/2),bq=y.c-Math.floor(y.r/2),dq=aq-bq,dr=x.r-y.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
 g.HEXKEEP_MAP={tiles,apron,path,sites,world,cellWorld,distance,village};
})(typeof window!=='undefined'?window:globalThis);

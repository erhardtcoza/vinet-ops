
export function pointInRing([x,y], ring){
  let inside=false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
    const intersect=((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
    if (intersect) inside=!inside;
  }
  return inside;
}
export function pointInPoly(pt, poly){ return pointInRing(pt, poly); }

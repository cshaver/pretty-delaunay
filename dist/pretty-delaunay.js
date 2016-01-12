!function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a="function"==typeof require&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)s(r[o]);return s}({1:[function(require,module,exports){"use strict";var Delaunay;!function(){function supertriangle(vertices){var i,dx,dy,dmax,xmid,ymid,xmin=Number.POSITIVE_INFINITY,ymin=Number.POSITIVE_INFINITY,xmax=Number.NEGATIVE_INFINITY,ymax=Number.NEGATIVE_INFINITY;for(i=vertices.length;i--;)vertices[i][0]<xmin&&(xmin=vertices[i][0]),vertices[i][0]>xmax&&(xmax=vertices[i][0]),vertices[i][1]<ymin&&(ymin=vertices[i][1]),vertices[i][1]>ymax&&(ymax=vertices[i][1]);return dx=xmax-xmin,dy=ymax-ymin,dmax=Math.max(dx,dy),xmid=xmin+.5*dx,ymid=ymin+.5*dy,[[xmid-20*dmax,ymid-dmax],[xmid,ymid+20*dmax],[xmid+20*dmax,ymid-dmax]]}function circumcircle(vertices,i,j,k){var xc,yc,m1,m2,mx1,mx2,my1,my2,dx,dy,x1=vertices[i][0],y1=vertices[i][1],x2=vertices[j][0],y2=vertices[j][1],x3=vertices[k][0],y3=vertices[k][1],fabsy1y2=Math.abs(y1-y2),fabsy2y3=Math.abs(y2-y3);if(EPSILON>fabsy1y2&&EPSILON>fabsy2y3)throw new Error("Eek! Coincident points!");return EPSILON>fabsy1y2?(m2=-((x3-x2)/(y3-y2)),mx2=(x2+x3)/2,my2=(y2+y3)/2,xc=(x2+x1)/2,yc=m2*(xc-mx2)+my2):EPSILON>fabsy2y3?(m1=-((x2-x1)/(y2-y1)),mx1=(x1+x2)/2,my1=(y1+y2)/2,xc=(x3+x2)/2,yc=m1*(xc-mx1)+my1):(m1=-((x2-x1)/(y2-y1)),m2=-((x3-x2)/(y3-y2)),mx1=(x1+x2)/2,mx2=(x2+x3)/2,my1=(y1+y2)/2,my2=(y2+y3)/2,xc=(m1*mx1-m2*mx2+my2-my1)/(m1-m2),yc=fabsy1y2>fabsy2y3?m1*(xc-mx1)+my1:m2*(xc-mx2)+my2),dx=x2-xc,dy=y2-yc,{i:i,j:j,k:k,x:xc,y:yc,r:dx*dx+dy*dy}}function dedup(edges){var i,j,a,b,m,n;for(j=edges.length;j;)for(b=edges[--j],a=edges[--j],i=j;i;)if(n=edges[--i],m=edges[--i],a===m&&b===n||a===n&&b===m){edges.splice(j,2),edges.splice(i,2);break}}var EPSILON=1/1048576;Delaunay={triangulate:function(vertices,key){var i,j,indices,st,open,closed,edges,dx,dy,a,b,c,n=vertices.length;if(3>n)return[];if(vertices=vertices.slice(0),key)for(i=n;i--;)vertices[i]=vertices[i][key];for(indices=new Array(n),i=n;i--;)indices[i]=i;for(indices.sort(function(i,j){return vertices[j][0]-vertices[i][0]}),st=supertriangle(vertices),vertices.push(st[0],st[1],st[2]),open=[circumcircle(vertices,n+0,n+1,n+2)],closed=[],edges=[],i=indices.length;i--;edges.length=0){for(c=indices[i],j=open.length;j--;)dx=vertices[c][0]-open[j].x,dx>0&&dx*dx>open[j].r?(closed.push(open[j]),open.splice(j,1)):(dy=vertices[c][1]-open[j].y,dx*dx+dy*dy-open[j].r>EPSILON||(edges.push(open[j].i,open[j].j,open[j].j,open[j].k,open[j].k,open[j].i),open.splice(j,1)));for(dedup(edges),j=edges.length;j;)b=edges[--j],a=edges[--j],open.push(circumcircle(vertices,a,b,c))}for(i=open.length;i--;)closed.push(open[i]);for(open.length=0,i=closed.length;i--;)closed[i].i<n&&closed[i].j<n&&closed[i].k<n&&open.push(closed[i].i,closed[i].j,closed[i].k);return open},contains:function(tri,p){if(p[0]<tri[0][0]&&p[0]<tri[1][0]&&p[0]<tri[2][0]||p[0]>tri[0][0]&&p[0]>tri[1][0]&&p[0]>tri[2][0]||p[1]<tri[0][1]&&p[1]<tri[1][1]&&p[1]<tri[2][1]||p[1]>tri[0][1]&&p[1]>tri[1][1]&&p[1]>tri[2][1])return null;var a=tri[1][0]-tri[0][0],b=tri[2][0]-tri[0][0],c=tri[1][1]-tri[0][1],d=tri[2][1]-tri[0][1],i=a*d-b*c;if(0===i)return null;var u=(d*(p[0]-tri[0][0])-b*(p[1]-tri[0][1]))/i,v=(a*(p[1]-tri[0][1])-c*(p[0]-tri[0][0]))/i;return 0>u||0>v||u+v>1?null:[u,v]}},"undefined"!=typeof module&&(module.exports=Delaunay)}()},{}],2:[function(require,module,exports){"use strict";var Color;!function(){Color={hexToRgba:function(hex){hex=hex.replace("#","");var r=parseInt(hex.substring(0,2),16),g=parseInt(hex.substring(2,4),16),b=parseInt(hex.substring(4,6),16);return"rgba("+r+","+g+","+b+",1)"},hexToRgbaArray:function(hex){hex=hex.replace("#","");var r=parseInt(hex.substring(0,2),16),g=parseInt(hex.substring(2,4),16),b=parseInt(hex.substring(4,6),16);return[r,g,b]},rgbToHsla:function(rgb){var h,s,r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;if(max===min)h=s=0;else{var d=max-min;switch(s=l>.5?d/(2-max-min):d/(max+min),max){case r:h=(g-b)/d+(b>g?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4}h/=6}return"hsla("+Math.round(360*h)+","+Math.round(100*s)+"%,"+Math.round(100*l)+"%,1)"},hslaAdjustAlpha:function(color,alpha){return color=color.split(","),"function"!=typeof alpha?color[3]=alpha:color[3]=alpha(parseInt(color[3])),color[3]+=")",color.join(",")},hslaAdjustLightness:function(color,lightness){return color=color.split(","),"function"!=typeof lightness?color[2]=lightness:color[2]=lightness(parseInt(color[2])),color[2]+="%",color.join(",")},rgbToHex:function(rgb){return"string"==typeof rgb&&(rgb=rgb.replace("rgb(","").replace(")","").split(",")),rgb=rgb.map(function(x){return x=parseInt(x).toString(16),1===x.length?"0"+x:x}),rgb.join("")}},"undefined"!=typeof module&&(module.exports=Color)}()},{}],3:[function(require,module,exports){"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}var Point,_createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){return protoProps&&defineProperties(Constructor.prototype,protoProps),staticProps&&defineProperties(Constructor,staticProps),Constructor}}();!function(){var Color=Color||require("./color"),_Point=function(){function _Point(x,y){_classCallCheck(this,_Point),Array.isArray(x)&&(y=x[1],x=x[0]),this.x=x,this.y=y,this.radius=1,this.color="black"}return _createClass(_Point,[{key:"render",value:function(ctx,color){ctx.beginPath(),ctx.arc(this.x,this.y,this.radius,0,2*Math.PI,!1),ctx.fillStyle=color||this.color,ctx.fill(),ctx.closePath()}},{key:"toString",value:function(){return"("+this.x+","+this.y+")"}},{key:"canvasColorAtPoint",value:function(imageData,colorSpace){if(colorSpace=colorSpace||"hsla",this._canvasColor)return this._canvasColor;var idx=Math.floor(this.y)*imageData.width*4+4*Math.floor(this.x);return"hsla"===colorSpace?this._canvasColor=Color.rgbToHsla(Array.prototype.slice.call(imageData.data,idx,idx+4)):this._canvasColor="rgb("+Array.prototype.slice.call(imageData.data,idx,idx+3).join()+")",this._canvasColor}},{key:"getCoords",value:function(){return[this.x,this.y]}},{key:"getDistanceTo",value:function(point){return Math.sqrt(Math.pow(this.x-point.x,2)+Math.pow(this.y-point.y,2))}},{key:"rescale",value:function(xA,xB,yA,yB,xC,xD,yC,yD){var xOldRange=xB-xA,yOldRange=yB-yA,xNewRange=xD-xC,yNewRange=yD-yC;this.x=(this.x-xA)*xNewRange/xOldRange+xC,this.y=(this.y-yA)*yNewRange/yOldRange+yC}},{key:"resetColor",value:function(){this._canvasColor=void 0}}]),_Point}();"undefined"!=typeof module&&(module.exports=_Point),Point=_Point}()},{"./color":2}],4:[function(require,module,exports){"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}var PointMap,_createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){return protoProps&&defineProperties(Constructor.prototype,protoProps),staticProps&&defineProperties(Constructor,staticProps),Constructor}}();!function(){var Point=Point||require("./point"),_PointMap=function(){function _PointMap(){_classCallCheck(this,_PointMap),this._map={}}return _createClass(_PointMap,[{key:"add",value:function(point){this._map[point.toString()]=!0}},{key:"addCoord",value:function(x,y){this.add(new Point(x,y))}},{key:"remove",value:function(point){this._map[point.toString()]=!1}},{key:"removeCoord",value:function(x,y){this.remove(new Point(x,y))}},{key:"clear",value:function(){this._map={}}},{key:"exists",value:function(point){return this._map[point.toString()]?!0:!1}}]),_PointMap}();"undefined"!=typeof module&&(module.exports=_PointMap),PointMap=_PointMap}()},{"./point":3}],5:[function(require,module,exports){"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){return protoProps&&defineProperties(Constructor.prototype,protoProps),staticProps&&defineProperties(Constructor,staticProps),Constructor}}();!function(){function linearScale(x0,x1,scale){return x0+scale*(x1-x0)}var Delaunay=require("./_delaunay"),Color=require("./color"),Random=require("./random"),Triangle=require("./triangle"),Point=require("./point"),PointMap=require("./pointMap"),PrettyDelaunay=function(){function PrettyDelaunay(canvas,options){var _this=this;_classCallCheck(this,PrettyDelaunay),this.options=Object.assign({},PrettyDelaunay.defaults(),options||{}),this.canvas=canvas,this.ctx=canvas.getContext("2d"),this.resizeCanvas(),this.points=[],this.colors=this.options.colors,this.pointMap=new PointMap,this.mousePosition=!1,this.options.hover&&(this.createHoverShadowCanvas(),this.canvas.addEventListener("mousemove",function(e){if(!_this.options.animate){var rect=canvas.getBoundingClientRect();_this.mousePosition=new Point(e.clientX-rect.left,e.clientY-rect.top),_this.hover()}},!1),this.canvas.addEventListener("mouseout",function(){_this.options.animate||(_this.mousePosition=!1,_this.hover())},!1))}return _createClass(PrettyDelaunay,[{key:"clear",value:function(){this.points=[],this.triangles=[],this.pointMap.clear(),this.center=new Point(0,0)}},{key:"randomize",value:function(min,max,minEdge,maxEdge,minGradients,maxGradients,colors){this.colors=colors?colors:this.options.colorPalette?this.options.colorPalette[Random.randomBetween(0,this.options.colorPalette.length-1)]:this.colors,this.minGradients=minGradients,this.maxGradients=maxGradients,this.resizeCanvas(),this.generateNewPoints(min,max,minEdge,maxEdge),this.triangulate(),this.generateGradients(minGradients,maxGradients),this.nextGradients=this.radialGradients.slice(0),this.generateGradients(),this.currentGradients=this.radialGradients.slice(0),this.render(),this.options.animate&&!this.looping&&this.initRenderLoop()}},{key:"initRenderLoop",value:function(){this.looping=!0,this.frameSteps=this.options.loopFrames,this.frame=this.frame?this.frame:this.frameSteps,this.renderLoop()}},{key:"renderLoop",value:function(){var _this2=this;if(this.frame++,this.frame>this.frameSteps){var nextGradients=this.nextGradients?this.nextGradients:this.radialGradients;this.generateGradients(),this.nextGradients=this.radialGradients,this.radialGradients=nextGradients.slice(0),this.currentGradients=nextGradients.slice(0),this.frame=0}else for(var i=0;i<Math.max(this.radialGradients.length,this.nextGradients.length);i++){var currentGradient=this.currentGradients[i],nextGradient=this.nextGradients[i];if("undefined"==typeof currentGradient){var newGradient={x0:nextGradient.x0,y0:nextGradient.y0,r0:0,x1:nextGradient.x1,y1:nextGradient.y1,r1:0,colorStop:nextGradient.colorStop};currentGradient=newGradient,this.currentGradients.push(newGradient),this.radialGradients.push(newGradient)}"undefined"==typeof nextGradient&&(nextGradient={x0:currentGradient.x0,y0:currentGradient.y0,r0:0,x1:currentGradient.x1,y1:currentGradient.y1,r1:0,colorStop:currentGradient.colorStop});var updatedGradient={},scale=this.frame/this.frameSteps;updatedGradient.x0=Math.round(linearScale(currentGradient.x0,nextGradient.x0,scale)),updatedGradient.y0=Math.round(linearScale(currentGradient.y0,nextGradient.y0,scale)),updatedGradient.r0=Math.round(linearScale(currentGradient.r0,nextGradient.r0,scale)),updatedGradient.x1=Math.round(linearScale(currentGradient.x1,nextGradient.x0,scale)),updatedGradient.y1=Math.round(linearScale(currentGradient.y1,nextGradient.y0,scale)),updatedGradient.r1=Math.round(linearScale(currentGradient.r1,nextGradient.r1,scale)),updatedGradient.colorStop=linearScale(currentGradient.colorStop,nextGradient.colorStop,scale),this.radialGradients[i]=updatedGradient}this.resetPointColors(),this.render(),this.options.animate?requestAnimationFrame(function(){_this2.renderLoop()}):this.looping=!1}},{key:"createHoverShadowCanvas",value:function(){this.hoverShadowCanvas=document.createElement("canvas"),this.shadowCtx=this.hoverShadowCanvas.getContext("2d"),this.hoverShadowCanvas.style.display="none"}},{key:"generateNewPoints",value:function(min,max,minEdge,maxEdge,multiplier){var area=this.canvas.width*this.canvas.height,perimeter=2*(this.canvas.width+this.canvas.height);multiplier=multiplier||this.options.multiplier,min=min>0?Math.ceil(min):Math.max(Math.ceil(area/1250*multiplier),50),max=max>0?Math.ceil(max):Math.max(Math.ceil(area/500*multiplier),50),minEdge=minEdge>0?Math.ceil(minEdge):Math.max(Math.ceil(perimeter/125*multiplier),5),maxEdge=maxEdge>0?Math.ceil(maxEdge):Math.max(Math.ceil(perimeter/50*multiplier),5),this.numPoints=Random.randomBetween(min,max),this.getNumEdgePoints=Random.randomNumberFunction(minEdge,maxEdge),this.clear(),this.generateCornerPoints(),this.generateEdgePoints(),this.generateRandomPoints(this.numPoints,1,1,this.width-1,this.height-1)}},{key:"generateCornerPoints",value:function(){this.points.push(new Point(0,0)),this.points.push(new Point(0,this.height)),this.points.push(new Point(this.width,0)),this.points.push(new Point(this.width,this.height))}},{key:"generateEdgePoints",value:function(){this.generateRandomPoints(this.getNumEdgePoints(),0,0,0,this.height),this.generateRandomPoints(this.getNumEdgePoints(),this.width,0,0,this.height),this.generateRandomPoints(this.getNumEdgePoints(),0,this.height,this.width,0),this.generateRandomPoints(this.getNumEdgePoints(),0,0,this.width,0)}},{key:"generateRandomPoints",value:function(numPoints,x,y,width,height){for(var center=new Point(Math.round(this.canvas.width/2),Math.round(this.canvas.height/2)),i=0;numPoints>i;i++){var point,j=0;do j++,point=new Point(Random.randomBetween(x,x+width),Random.randomBetween(y,y+height));while(this.pointMap.exists(point)&&10>j);10>j&&(this.points.push(point),this.pointMap.add(point)),center.getDistanceTo(point)<center.getDistanceTo(this.center)?this.center=point:this.center.isCenter=!1}this.center.isCenter=!0}},{key:"triangulate",value:function(){this.triangles=[];for(var vertices=this.points.map(function(point){return point.getCoords()}),triangulated=Delaunay.triangulate(vertices),i=0;i<triangulated.length;i+=3){var arr=[];arr.push(vertices[triangulated[i]]),arr.push(vertices[triangulated[i+1]]),arr.push(vertices[triangulated[i+2]]),this.triangles.push(arr)}this.triangles=this.triangles.map(function(triangle){return new Triangle(new Point(triangle[0]),new Point(triangle[1]),new Point(triangle[2]))})}},{key:"resetPointColors",value:function(){var i;for(i=0;i<this.triangles.length;i++)this.triangles[i].resetPointColors();for(i=0;i<this.points.length;i++)this.points[i].resetColor()}},{key:"generateGradients",value:function(minGradients,maxGradients){this.radialGradients=[],minGradients=minGradients||this.minGradients>0?minGradients||this.minGradients:1,maxGradients=maxGradients||this.maxGradients>0?maxGradients||this.maxGradients:2,this.numGradients=Random.randomBetween(minGradients,maxGradients);for(var i=0;i<this.numGradients;i++)this.generateRadialGradient()}},{key:"generateRadialGradient",value:function(){var x0,y0,minX=Math.ceil(Math.sqrt(this.canvas.width)),maxX=Math.ceil(this.canvas.width-Math.sqrt(this.canvas.width)),minY=Math.ceil(Math.sqrt(this.canvas.height)),maxY=Math.ceil(this.canvas.height-Math.sqrt(this.canvas.height)),minRadius=Math.ceil(Math.max(this.canvas.height,this.canvas.width)/Math.max(Math.sqrt(this.numGradients),2)),maxRadius=Math.ceil(Math.max(this.canvas.height,this.canvas.width)/Math.max(Math.log(this.numGradients),1)),randomCanvasX=Random.randomNumberFunction(minX,maxX),randomCanvasY=Random.randomNumberFunction(minY,maxY),randomCanvasRadius=Random.randomNumberFunction(minRadius,maxRadius),r0=randomCanvasRadius();if(this.radialGradients.length>0){for(var lastGradient=this.radialGradients[this.radialGradients.length-1],pointInLastCircle=Random.randomInCircle(lastGradient.r0,lastGradient.x0,lastGradient.y0);pointInLastCircle.x<0||pointInLastCircle.y<0||pointInLastCircle.x>this.canvas.width||pointInLastCircle.y>this.canvas.height;)pointInLastCircle=Random.randomInCircle(lastGradient.r0,lastGradient.x0,lastGradient.y0);x0=pointInLastCircle.x,y0=pointInLastCircle.y}else x0=randomCanvasX(),y0=randomCanvasY();var pointInCircle=Random.randomInCircle(.09*r0,x0,y0),x1=pointInCircle.x,y1=pointInCircle.y,vX=x1-x0,vY=y1-y0,magV=Math.sqrt(vX*vX+vY*vY),aX=x0+vX/magV*r0,aY=y0+vY/magV*r0,dist=Math.sqrt((x1-aX)*(x1-aX)+(y1-aY)*(y1-aY)),r1=Random.randomBetween(1,Math.sqrt(dist)),colorStop=Random.randomBetween(2,8)/10;this.radialGradients.push({x0:x0,y0:y0,r0:r0,x1:x1,y1:y1,r1:r1,colorStop:colorStop})}},{key:"sortPoints",value:function(){this.points.sort(function(a,b){return a.x<b.x?-1:a.x>b.x?1:a.y<b.y?-1:a.y>b.y?1:0})}},{key:"resizeCanvas",value:function(){var parent=this.canvas.parentElement;this.canvas.width=this.width=parent.offsetWidth,this.canvas.height=this.height=parent.offsetHeight,this.hoverShadowCanvas&&(this.hoverShadowCanvas.width=this.width=parent.offsetWidth,this.hoverShadowCanvas.height=this.height=parent.offsetHeight)}},{key:"rescale",value:function(){var xMin=0,xMax=this.canvas.width,yMin=0,yMax=this.canvas.height;if(this.resizeCanvas(),"scalePoints"===this.options.resizeMode)for(var i=0;i<this.points.length;i++)this.points[i].rescale(xMin,xMax,yMin,yMax,0,this.canvas.width,0,this.canvas.height);else this.generateNewPoints();this.triangulate(),this.rescaleGradients(this.radialGradients,xMin,xMax,yMin,yMax),this.rescaleGradients(this.currentGradients,xMin,xMax,yMin,yMax),this.rescaleGradients(this.nextGradients,xMin,xMax,yMin,yMax),this.render()}},{key:"rescaleGradients",value:function(array,xMin,xMax,yMin,yMax){for(var i=0;i<array.length;i++){var circle0=new Point(array[i].x0,array[i].y0),circle1=new Point(array[i].x1,array[i].y1);circle0.rescale(xMin,xMax,yMin,yMax,0,this.canvas.width,0,this.canvas.height),circle1.rescale(xMin,xMax,yMin,yMax,0,this.canvas.width,0,this.canvas.height),array[i].x0=circle0.x,array[i].y0=circle0.y,array[i].x1=circle1.x,array[i].y1=circle1.y}}},{key:"hover",value:function(){if(this.mousePosition){var rgb=this.mousePosition.canvasColorAtPoint(this.shadowImageData,"rgb"),hex=Color.rgbToHex(rgb),dec=parseInt(hex,16);dec>=0&&dec<this.triangles.length&&this.triangles[dec].pointInTriangle(this.mousePosition)&&(this.resetTriangle(),this.lastTriangle!==dec&&this.options.onTriangleHover(this.triangles[dec],this.ctx,this.options),this.lastTriangle=dec)}else this.resetTriangle()}},{key:"resetTriangle",value:function(){if(this.lastTriangle&&this.lastTriangle>=0&&this.lastTriangle<this.triangles.length){var lastTriangle=this.triangles[this.lastTriangle],minX=lastTriangle.minX()-1,minY=lastTriangle.minY()-1,maxX=lastTriangle.maxX()+1,maxY=lastTriangle.maxY()+1;this.ctx.putImageData(this.renderedImageData,0,0,minX,minY,maxX-minX,maxY-minY),this.lastTriangle=!1}}},{key:"render",value:function(){this.renderGradient(),this.gradientImageData=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height),this.renderTriangles(this.options.showTriangles,this.options.showEdges),this.renderExtras(),this.renderedImageData=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);var centerColor=this.center.canvasColorAtPoint();parseInt(centerColor.split(",")[2])<50?this.options.onDarkBackground(centerColor):this.options.onLightBackground(centerColor)}},{key:"renderExtras",value:function(){this.options.showPoints&&this.renderPoints(),this.options.showCircles&&this.renderGradientCircles(),this.options.showCentroids&&this.renderCentroids()}},{key:"renderNewColors",value:function(colors){this.colors=colors||this.colors,this.resetPointColors(),this.render()}},{key:"renderNewGradient",value:function(minGradients,maxGradients){this.generateGradients(minGradients,maxGradients),this.nextGradients=this.radialGradients.slice(0),this.generateGradients(),this.currentGradients=this.radialGradients.slice(0),this.resetPointColors(),this.render()}},{key:"renderNewTriangles",value:function(min,max,minEdge,maxEdge,multiplier){this.generateNewPoints(min,max,minEdge,maxEdge,multiplier),this.triangulate(),this.render()}},{key:"renderGradient",value:function(){for(var i=0;i<this.radialGradients.length;i++){var radialGradient=this.ctx.createRadialGradient(this.radialGradients[i].x0,this.radialGradients[i].y0,this.radialGradients[i].r0,this.radialGradients[i].x1,this.radialGradients[i].y1,this.radialGradients[i].r1),outerColor=this.colors[2];i>0&&(outerColor=this.colors[1].split(","),outerColor[3]="0)",outerColor=outerColor.join(",")),radialGradient.addColorStop(1,this.colors[0]),radialGradient.addColorStop(this.radialGradients[i].colorStop,this.colors[1]),radialGradient.addColorStop(0,outerColor),this.canvas.parentElement.style.backgroundColor=this.colors[2],this.ctx.fillStyle=radialGradient,this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)}}},{key:"renderTriangles",value:function(triangles,edges){this.center.canvasColorAtPoint(this.gradientImageData);for(var i=0;i<this.triangles.length;i++)if(this.triangles[i].color=this.triangles[i].colorAtCentroid(this.gradientImageData),triangles&&edges?(this.triangles[i].stroke=this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData)),this.triangles[i].render(this.ctx)):triangles?(this.triangles[i].stroke=this.triangles[i].color,this.triangles[i].render(this.ctx)):edges&&(this.triangles[i].stroke=this.options.edgeColor(this.triangles[i].colorAtCentroid(this.gradientImageData)),this.triangles[i].render(this.ctx,!1)),this.hoverShadowCanvas){var color="#"+("000000"+i.toString(16)).slice(-6);this.triangles[i].render(this.shadowCtx,color,!1)}this.hoverShadowCanvas&&(this.shadowImageData=this.shadowCtx.getImageData(0,0,this.canvas.width,this.canvas.height))}},{key:"renderPoints",value:function(){for(var i=0;i<this.points.length;i++){var color=this.options.pointColor(this.points[i].canvasColorAtPoint(this.gradientImageData));this.points[i].render(this.ctx,color)}}},{key:"renderGradientCircles",value:function(){for(var i=0;i<this.radialGradients.length;i++){this.ctx.beginPath(),this.ctx.arc(this.radialGradients[i].x0,this.radialGradients[i].y0,this.radialGradients[i].r0,0,2*Math.PI,!0);var center1=new Point(this.radialGradients[i].x0,this.radialGradients[i].y0);this.ctx.strokeStyle=center1.canvasColorAtPoint(this.gradientImageData),this.ctx.stroke(),this.ctx.beginPath(),this.ctx.arc(this.radialGradients[i].x1,this.radialGradients[i].y1,this.radialGradients[i].r1,0,2*Math.PI,!0);var center2=new Point(this.radialGradients[i].x1,this.radialGradients[i].y1);this.ctx.strokeStyle=center2.canvasColorAtPoint(this.gradientImageData),this.ctx.stroke()}}},{key:"renderCentroids",value:function(){for(var i=0;i<this.triangles.length;i++){var color=this.options.centroidColor(this.triangles[i].colorAtCentroid(this.gradientImageData));this.triangles[i].centroid().render(this.ctx,color)}}},{key:"toggleTriangles",value:function(){this.options.showTriangles=!this.options.showTriangles,this.render()}},{key:"togglePoints",value:function(){this.options.showPoints=!this.options.showPoints,this.render()}},{key:"toggleCircles",value:function(){this.options.showCircles=!this.options.showCircles,this.render()}},{key:"toggleCentroids",value:function(){this.options.showCentroids=!this.options.showCentroids,this.render()}},{key:"toggleEdges",value:function(){this.options.showEdges=!this.options.showEdges,this.render()}},{key:"toggleAnimation",value:function(){this.options.animate=!this.options.animate,this.options.animate&&this.initRenderLoop()}}],[{key:"defaults",value:function(){return{showTriangles:!0,showPoints:!1,showCircles:!1,showCentroids:!1,showEdges:!0,hover:!0,multiplier:.5,animate:!1,loopFrames:250,colors:["hsla(0, 0%, 100%, 1)","hsla(0, 0%, 50%, 1)","hsla(0, 0%, 0%, 1)"],colorPalette:!1,resizeMode:"scalePoints",onDarkBackground:function(){},onLightBackground:function(){},onTriangleHover:function(triangle,ctx,options){var fill=options.hoverColor(triangle.color),stroke=fill;triangle.render(ctx,options.showEdges?fill:!1,options.showEdges?!1:stroke)},edgeColor:function(color){return color=Color.hslaAdjustLightness(color,function(lightness){return(lightness+200-2*lightness)/3}),color=Color.hslaAdjustAlpha(color,.25)},pointColor:function(color){return color=Color.hslaAdjustLightness(color,function(lightness){return(lightness+200-2*lightness)/3}),color=Color.hslaAdjustAlpha(color,1)},centroidColor:function(color){return color=Color.hslaAdjustLightness(color,function(lightness){return(lightness+200-2*lightness)/3}),color=Color.hslaAdjustAlpha(color,.25)},hoverColor:function(color){return color=Color.hslaAdjustLightness(color,function(lightness){return 100-lightness}),color=Color.hslaAdjustAlpha(color,.5)}}}}]),PrettyDelaunay}();window.PrettyDelaunay=PrettyDelaunay}()},{"./_delaunay":1,"./color":2,"./point":3,"./pointMap":4,"./random":6,"./triangle":7}],6:[function(require,module,exports){"use strict";var Random;!function(){var Point=Point||require("./point");Random={randomNumberFunction:function(max,min){if(min=min||0,min>max){var temp=max;max=min,min=temp}return function(){return Math.floor(Math.random()*(max-min+1))+min}},randomBetween:function(max,min){return min=min||0,Random.randomNumberFunction(max,min)()},randomInCircle:function(radius,ox,oy){var angle=Math.random()*Math.PI*2,rad=Math.sqrt(Math.random())*radius,x=ox+rad*Math.cos(angle),y=oy+rad*Math.sin(angle);return new Point(x,y)},randomRgba:function(){return"rgba("+Random.randomBetween(255)+","+Random.randomBetween(255)+","+Random.randomBetween(255)+", 1)"},randomHsla:function(){return"hsla("+Random.randomBetween(360)+","+Random.randomBetween(100)+"%,"+Random.randomBetween(100)+"%, 1)"}},"undefined"!=typeof module&&(module.exports=Random)}()},{"./point":3}],7:[function(require,module,exports){"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}var Triangle,_createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){return protoProps&&defineProperties(Constructor.prototype,protoProps),staticProps&&defineProperties(Constructor,staticProps),Constructor}}();!function(){var Point=Point||require("./point"),_Triangle=function(){function _Triangle(a,b,c){_classCallCheck(this,_Triangle),this.p1=this.a=a,this.p2=this.b=b,this.p3=this.c=c,this.color="black",this.stroke="black"}return _createClass(_Triangle,[{key:"render",value:function(ctx,color,stroke){if(ctx.beginPath(),ctx.moveTo(this.a.x,this.a.y),ctx.lineTo(this.b.x,this.b.y),ctx.lineTo(this.c.x,this.c.y),ctx.closePath(),ctx.strokeStyle=stroke||this.stroke||this.color,ctx.fillStyle=color||this.color,color!==!1&&stroke!==!1){var tempStroke=ctx.strokeStyle;ctx.strokeStyle=ctx.fillStyle,ctx.stroke(),ctx.strokeStyle=tempStroke}color!==!1&&ctx.fill(),stroke!==!1&&ctx.stroke(),ctx.closePath()}},{key:"randomInside",value:function(){var r1=Math.random(),r2=Math.random(),x=(1-Math.sqrt(r1))*this.p1.x+Math.sqrt(r1)*(1-r2)*this.p2.x+Math.sqrt(r1)*r2*this.p3.x,y=(1-Math.sqrt(r1))*this.p1.y+Math.sqrt(r1)*(1-r2)*this.p2.y+Math.sqrt(r1)*r2*this.p3.y;return new Point(x,y)}},{key:"colorAtCentroid",value:function(imageData){return this.centroid().canvasColorAtPoint(imageData)}},{key:"resetPointColors",value:function(){this.centroid().resetColor(),this.p1.resetColor(),this.p2.resetColor(),this.p3.resetColor()}},{key:"centroid",value:function(){if(this._centroid)return this._centroid;var x=Math.round((this.p1.x+this.p2.x+this.p3.x)/3),y=Math.round((this.p1.y+this.p2.y+this.p3.y)/3);return this._centroid=new Point(x,y),this._centroid}},{key:"pointInTriangle",value:function(point){var alpha=((this.p2.y-this.p3.y)*(point.x-this.p3.x)+(this.p3.x-this.p2.x)*(point.y-this.p3.y))/((this.p2.y-this.p3.y)*(this.p1.x-this.p3.x)+(this.p3.x-this.p2.x)*(this.p1.y-this.p3.y)),beta=((this.p3.y-this.p1.y)*(point.x-this.p3.x)+(this.p1.x-this.p3.x)*(point.y-this.p3.y))/((this.p2.y-this.p3.y)*(this.p1.x-this.p3.x)+(this.p3.x-this.p2.x)*(this.p1.y-this.p3.y)),gamma=1-alpha-beta;return alpha>0&&beta>0&&gamma>0}},{key:"rescalePoints",value:function(xA,xB,yA,yB,xC,xD,yC,yD){this.p1.rescale(xA,xB,yA,yB,xC,xD,yC,yD),this.p2.rescale(xA,xB,yA,yB,xC,xD,yC,yD),this.p3.rescale(xA,xB,yA,yB,xC,xD,yC,yD),this.centroid()}},{key:"maxX",value:function(){return Math.max(this.p1.x,this.p2.x,this.p3.x)}},{key:"maxY",value:function(){return Math.max(this.p1.y,this.p2.y,this.p3.y)}},{key:"minX",value:function(){return Math.min(this.p1.x,this.p2.x,this.p3.x)}},{key:"minY",value:function(){return Math.min(this.p1.y,this.p2.y,this.p3.y)}},{key:"getPoints",value:function(){return[this.p1,this.p2,this.p3]}}]),_Triangle}();"undefined"!=typeof module&&(module.exports=_Triangle),Triangle=_Triangle}()},{"./point":3}]},{},[5]);
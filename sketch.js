let x=10;
let y;
let x2;
let y2;
let ball;
function setup() {
   
    let canvas = createCanvas(1227, 637);
    
    
    centerCanvas(canvas);
    
  y=height/2;
  y2=height/2;
  x2=width-20;
  let ballWidth = 10;
  let ballheight = 10;
  ball = {
      x: width/2,
      y : height/2,
      width : ballWidth,
      height : ballheight,
      xspeed : 4,
      yspeed : 3,
  };
  function centerCanvas(canvas) {
    canvas.position(5,5);
  }
}
  
  function draw() {
    background("black");
    

  
    fill(255, 0, 0);
    rect(x,y, 10, 70);
    
       
      
        if (keyIsDown(87)&&y>0){
            y -= 5;
       } if (keyIsDown(83)&&y+70<height) {
        y += 5;
      }
    
      
         
    fill(255, 0, 0);
    rect(x2,y2, 10, 70);
        
          if (keyIsDown(UP_ARROW)&&y2>0){
              y2 -= 5;
         } if (keyIsDown(DOWN_ARROW)&&y2+70<height) {
          y2 += 5;
        }
    fill("white");
    ball.x+=ball.xspeed;
    ball.y+=ball.yspeed;
    rect(ball.x,ball.y,ball.width,ball.height);
   
      if (ball.y <= 0 || ball.y + ball.height >= height) {
        ball.yspeed *= -1;
      }
      if (ball.x <= x + 10 && ball.y + ball.height >= y && ball.y <= y + 70) {
        ball.xspeed *= -1;
      }
      if (ball.x + ball.width >= x2 && ball.y + ball.height >= y2 && ball.y <= y2 + 70) {
        ball.xspeed *= -1;
      }
       }
     
  
  

  
 
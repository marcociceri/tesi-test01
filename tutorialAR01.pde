import jp.nyatla.nyar4psg.*;
import processing.opengl.*;
import processing.video.*;


Capture myCam;
NyARMultiBoard nya;
float i = 0;

void setup(){
  size(640,480,P3D);
  myCam = new Capture(this,width,height,30);
  String[]patts = {"patt.hiro"};
  double[] widths = {80};
  nya = new NyARMultiBoard(this,width,height,"camera_para.dat",patts,widths);
}

void draw(){
  background(200);
  myCam.read();
  image(myCam,0,0);
  
  if(nya.detect(myCam)){
    nya.markers[0].beginTransform();
    translate(0,0,25);
    box(50);
    nya.markers[0].endTransform();
  }
  
}

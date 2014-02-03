import processing.core.*; 
import processing.xml.*; 

import jp.nyatla.nyar4psg.*; 
import processing.opengl.*; 
import processing.video.*; 

import java.applet.*; 
import java.awt.Dimension; 
import java.awt.Frame; 
import java.awt.event.MouseEvent; 
import java.awt.event.KeyEvent; 
import java.awt.event.FocusEvent; 
import java.awt.Image; 
import java.io.*; 
import java.net.*; 
import java.text.*; 
import java.util.*; 
import java.util.zip.*; 
import java.util.regex.*; 

public class tutorialAR01 extends PApplet {






Capture myCam;
NyARMultiBoard nya;
float i = 0;

public void setup(){
  size(640,480,P3D);
  myCam = new Capture(this,width,height,30);
  String[]patts = {"patt.hiro"};
  double[] widths = {80};
  nya = new NyARMultiBoard(this,width,height,"camera_para.dat",patts,widths);
}

public void draw(){
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
  static public void main(String args[]) {
    PApplet.main(new String[] { "--present", "--bgcolor=#666666", "--stop-color=#cccccc", "tutorialAR01" });
  }
}

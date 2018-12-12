import * as util from './util.js';
import {
  Vector3,
  Matrix4,
} from '../lib/cuon-matrix.js';

const BLACK = [0, 0, 0, 1];
const RED = [1, 0, 0, 1];
const BLUE = [0, 0, 1, 1];

const LINE_COORDS = [
  [-1, 0, 0, 1],
  [1, 0, 0, 1],
];

// Camera settings
const EYE_POSITION_INITIAL = [0, 0, 2.5];
const LOOK_AT_COORDS = [0, 0, 0];
const UP_VECTOR = [0, 1, 0];
const MAX_ROTATION_ANGLE = 170;

// Perspective settings
const FIELD_OF_VIEW_DEGREES = 30;
const NEAR_PLANE_DISTANCE = 1;
const FAR_PLANE_DISTANCE = 100;

// identity model matrix, because spectrograph will be centered at the origin
const modelMatrix = new Matrix4();

function screenPositionToRotationAngle(position) {
  return 0.5 * MAX_ROTATION_ANGLE * position;
}

function getViewMatrix(yawAngle, pitchAngle) {
  const Y_AXIS = [0, 1, 0]; // for yaw
  const X_AXIS = [1, 0, 0]; // for pitch
  const rotationMatrix = new Matrix4()
    .setRotate(pitchAngle, ...X_AXIS)
    .rotate(yawAngle, ...Y_AXIS);
  const eyePosition = rotationMatrix.multiplyVector3(new Vector3(EYE_POSITION_INITIAL)).elements;
  return new Matrix4().setLookAt(...eyePosition, ...LOOK_AT_COORDS, ...UP_VECTOR);
}

const canvas = util.createFullScreenCanvas();
const regl = createREGL(canvas);

(async function init() {
  const [vert, frag] = await Promise.all(['./src/shaders/vert.glsl', './src/shaders/frag.glsl'].map(util.fetchShaderSource));

  const drawSpectrograph = regl({
    vert,
    frag,
    primitive: 'lines',
    uniforms: {
      mvpMatrix: (context, { viewMatrix }) => {
        const aspectRatio = context.drawingBufferWidth / context.drawingBufferHeight;
        const projMatrix = new Matrix4()
          .setPerspective(FIELD_OF_VIEW_DEGREES, aspectRatio, NEAR_PLANE_DISTANCE, FAR_PLANE_DISTANCE);
        return new Matrix4().set(projMatrix)
          .multiply(viewMatrix)
          .multiply(modelMatrix)
          .elements;
      }
    },
    attributes: {
      position: LINE_COORDS,
      color: [
        RED,
        BLUE,
      ],
    },
    count: 2,
  });

  function draw(viewMatrix) {
    regl.clear({ color: BLACK });
    drawSpectrograph({ viewMatrix });
  }
  
  function onMouseMove(mouseEvent) {
    const [x, y] = util.getMouseWebGLCoordinates(mouseEvent, canvas);
    const yawAngle = screenPositionToRotationAngle(x);
    const pitchAngle = screenPositionToRotationAngle(y);
    const viewMatrix = getViewMatrix(yawAngle, pitchAngle);
    draw(viewMatrix);
  }

  // Draw initial frame.
  draw(getViewMatrix(0, 0));

  document.body.addEventListener('mousemove', onMouseMove);
})();

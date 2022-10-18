import * as THREE from "three";
import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { useControls, Leva } from "leva";
import "./app.css";

function Boids({
  count,
  size,
  speed,
  cohesionFactor,
  seperationFactor,
  alignmentFactor,
  useGrid,
  debug,
}) {
  const ref = useRef();
  const mesh = new THREE.Object3D();

  const boidScale = 0.1;
  const maxSpeed = speed;
  const turnSpeed = maxSpeed * 3;
  const edgeMargin = 0.5;
  const minSpeed = maxSpeed * 0.75;
  const visualRange = 0.5;
  const minDistance = 0.15;

  const xBound = size - edgeMargin;
  const yBound = size / 2 - edgeMargin;
  const zBound = size - edgeMargin;

  const boids = useRef([]);
  const boidsSorted = useRef([]);

  // Spatial grid
  const grid = useRef([]);
  const gridCounts = useRef([]);
  const gridOffsets = useRef([]);

  const gridCellSize = visualRange;
  const gridDimX = Math.floor((xBound * 2) / gridCellSize) + 20;
  const gridDimY = Math.floor((yBound * 2) / gridCellSize) + 20;
  const gridDimZ = Math.floor((zBound * 2) / gridCellSize) + 20;
  const gridTotalCells = gridDimX * gridDimY * gridDimZ;

  // Generate boids
  useEffect(() => {
    boids.current = [];
    boidsSorted.current = [];
    for (let i = 0; i < count; i++) {
      let boid = {};
      boid.position = new THREE.Vector3(
        Math.random() * xBound * 2 - xBound,
        Math.random() * yBound * 2 - yBound,
        Math.random() * zBound * 2 - zBound
      );
      boid.velocity = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      );
      ref.current.setColorAt(i, new THREE.Color(0xff0000));
      if (debug) {
        ref.current.setColorAt(i, new THREE.Color(0xffffff));
        if (i == 0) {
          boid.isMain = true;
          ref.current.setColorAt(i, new THREE.Color(0xff0000));
        }
      }
      boids.current.push(boid);
    }
  }, [count]);

  // toggle grid
  useEffect(() => {
    boidsSorted.current = [];
  }, [useGrid]);

  // Toggle debug
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      ref.current.setColorAt(i, new THREE.Color(0xff0000));
      if (debug) {
        ref.current.setColorAt(i, new THREE.Color(0xffffff));
        if (i == 0) {
          boids.current[i].isMain = true;
          ref.current.setColorAt(i, new THREE.Color(0xff0000));
        }
      }
    }
    ref.current.instanceColor.needsUpdate = true;
  }, [debug]);

  function clearGrid() {
    for (let i = 0; i < gridTotalCells; i++) {
      gridCounts.current[i] = 0;
      gridOffsets.current[i] = 0;
    }
  }

  function getGridID(boid) {
    let x = Math.floor(boid.position.x / gridCellSize + gridDimX / 2);
    let y = Math.floor(boid.position.y / gridCellSize + gridDimY / 2);
    let z = Math.floor(boid.position.z / gridCellSize + gridDimZ / 2);
    return gridDimY * gridDimX * z + gridDimX * y + x;
  }

  function getGridLocation(boid) {
    let x = Math.floor(boid.position.x / gridCellSize + gridDimX / 2);
    let y = Math.floor(boid.position.y / gridCellSize + gridDimY / 2);
    let z = Math.floor(boid.position.z / gridCellSize + gridDimZ / 2);
    return { x, y, z };
  }

  function getgridIDbyLoc(x, y, z) {
    return gridDimY * gridDimX * z + gridDimX * y + x;
  }

  function updateGrid() {
    for (let i = 0; i < count; i++) {
      let id = getGridID(boids.current[i]);
      grid.current[i] = { x: id, y: gridCounts.current[id] };
      gridCounts.current[id]++;
    }
  }

  function generateGridOffsets() {
    gridOffsets.current[0] = gridCounts.current[0];
    for (let i = 1; i < gridTotalCells; i++) {
      gridOffsets.current[i] =
        gridOffsets.current[i - 1] + gridCounts.current[i];
    }
  }

  function rearrangeBoids() {
    for (let i = 0; i < count; i++) {
      let gridId = grid.current[i].x;
      let cellOffset = grid.current[i].y;
      let index = gridOffsets.current[gridId] - 1 - cellOffset;
      boidsSorted.current[index] = boids.current[i];
    }
  }

  function mergedBehavioursGrid(boid, delta, index) {
    const center = new THREE.Vector3();
    const close = new THREE.Vector3();
    const avgVel = new THREE.Vector3();
    let neighbours = 0;

    const gridXYZ = getGridLocation(boid);
    for (let z = gridXYZ.z - 1; z <= gridXYZ.z + 1; z++) {
      for (let y = gridXYZ.y - 1; y <= gridXYZ.y + 1; y++) {
        for (let x = gridXYZ.x - 1; x <= gridXYZ.x + 1; x++) {
          let gridCell = getgridIDbyLoc(x, y, z);
          let end = gridOffsets.current[gridCell];
          let start = end - gridCounts.current[gridCell];
          for (let i = start; i < end; i++) {
            const other = boidsSorted.current[i];
            const distance = boid.position.distanceTo(other.position);
            if (debug && other.isMain && !boid.isMain) {
              ref.current.setColorAt(index, new THREE.Color(0x000000));
            }
            if (distance < visualRange) {
              if (debug && other.isMain && !boid.isMain) {
                ref.current.setColorAt(index, new THREE.Color(0x00ff00));
              }
              if (distance < minDistance) {
                close.add(boid.position).sub(other.position);
              }
              center.add(other.position);
              avgVel.add(other.velocity);
              neighbours++;
            }
          }
        }
      }
    }

    if (neighbours > 0) {
      center.divideScalar(neighbours);
      avgVel.divideScalar(neighbours);

      boid.velocity.x += (center.x - boid.position.x) * cohesionFactor * delta;
      boid.velocity.y += (center.y - boid.position.y) * cohesionFactor * delta;
      boid.velocity.z += (center.z - boid.position.z) * cohesionFactor * delta;

      boid.velocity.x += (avgVel.x - boid.velocity.x) * alignmentFactor * delta;
      boid.velocity.y += (avgVel.y - boid.velocity.y) * alignmentFactor * delta;
      boid.velocity.z += (avgVel.z - boid.velocity.z) * alignmentFactor * delta;
    }

    boid.velocity.x += close.x * seperationFactor * delta;
    boid.velocity.y += close.y * seperationFactor * delta;
    boid.velocity.z += close.z * seperationFactor * delta;
  }

  function mergedBehaviours(boid, delta, index) {
    const center = new THREE.Vector3();
    const close = new THREE.Vector3();
    const avgVel = new THREE.Vector3();
    let neighbours = 0;

    for (let i = 0; i < count; i++) {
      const other = boidsSorted.current[i];
      const distance = boid.position.distanceTo(other.position);
      if (debug && other.isMain && !boid.isMain) {
        ref.current.setColorAt(index, new THREE.Color(0x000000));
      }
      if (distance < visualRange) {
        if (debug && other.isMain && !boid.isMain) {
          ref.current.setColorAt(index, new THREE.Color(0x00ff00));
        }
        if (distance < minDistance) {
          close.add(boid.position).sub(other.position);
        }
        center.add(other.position);
        avgVel.add(other.velocity);
        neighbours++;
      }
    }

    if (neighbours > 0) {
      center.divideScalar(neighbours);
      avgVel.divideScalar(neighbours);

      boid.velocity.x += (center.x - boid.position.x) * cohesionFactor * delta;
      boid.velocity.y += (center.y - boid.position.y) * cohesionFactor * delta;
      boid.velocity.z += (center.z - boid.position.z) * cohesionFactor * delta;

      boid.velocity.x += (avgVel.x - boid.velocity.x) * alignmentFactor * delta;
      boid.velocity.y += (avgVel.y - boid.velocity.y) * alignmentFactor * delta;
      boid.velocity.z += (avgVel.z - boid.velocity.z) * alignmentFactor * delta;
    }

    boid.velocity.x += close.x * seperationFactor * delta;
    boid.velocity.y += close.y * seperationFactor * delta;
    boid.velocity.z += close.z * seperationFactor * delta;
  }

  function keepInBounds(boid, delta) {
    if (boid.position.x > xBound) {
      boid.velocity.x -= turnSpeed * delta;
    } else if (boid.position.x < -xBound) {
      boid.velocity.x += turnSpeed * delta;
    }

    if (boid.position.y > yBound) {
      boid.velocity.y -= turnSpeed * delta;
    } else if (boid.position.y < -yBound) {
      boid.velocity.y += turnSpeed * delta;
    }

    if (boid.position.z > zBound) {
      boid.velocity.z -= turnSpeed * delta;
    } else if (boid.position.z < -zBound) {
      boid.velocity.z += turnSpeed * delta;
    }
  }

  function limitSpeed(boid) {
    boid.velocity.clampLength(minSpeed, maxSpeed);
  }

  useFrame((state, delta) => {
    // Spatial grid
    if (useGrid) {
      clearGrid();
      updateGrid();
      generateGridOffsets();
      rearrangeBoids();
    } else {
      boidsSorted.current = boids.current;
    }

    for (let i = 0; i < count; i++) {
      const boid = boidsSorted.current[i];

      if (debug) {
        if (boid.isMain) {
          ref.current.setColorAt(i, new THREE.Color(0xff0000));
        } else {
          ref.current.setColorAt(i, new THREE.Color(0xffffff));
        }
      }

      if (useGrid) {
        mergedBehavioursGrid(boid, delta, i);
      } else {
        mergedBehaviours(boid, delta, i);
      }
      limitSpeed(boid);
      keepInBounds(boid, delta);

      // Update boids
      boid.position.addScaledVector(boid.velocity, delta);
      mesh.position.set(boid.position.x, boid.position.y, boid.position.z);
      let rot = new THREE.Quaternion();
      rot.setFromUnitVectors(
        THREE.Object3D.DefaultUp,
        boid.velocity.clone().normalize()
      );
      mesh.setRotationFromQuaternion(rot);
      mesh.updateMatrix();
      ref.current.setMatrixAt(i, mesh.matrix);
    }
    // Update the instance
    ref.current.instanceMatrix.needsUpdate = true;

    // update colours if debugging
    if (debug) {
      ref.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      castShadow
      receiveShadow
      ref={ref}
      args={[null, null, count]}
    >
      <coneGeometry args={[boidScale / 3, boidScale]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

function Plane({ size = 3 }) {
  return (
    <mesh
      receiveShadow
      position={new THREE.Vector3(0, -size / 2 - 0.25, 0)}
      rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
    >
      <planeGeometry args={[size * 2, size * 2]} />
      <meshStandardMaterial color={0xffffff} />
    </mesh>
  );
}

function ResetCamera({ size = 5 }) {
  useThree(({ camera }) => {
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = size * 2.1;
  });
}

function App() {
  const { numBoids, useSpatialGrid, debug } = useControls({
    numBoids: {
      value: 32,
      min: 32,
      max: 4096,
      step: 1,
    },
    useSpatialGrid: true,
    debug: false,
  });
  const { cohesion, seperation, alignment } = useControls("Params", {
    cohesion: { value: 1, min: 0, max: 3, step: 0.01 },
    seperation: { value: 30, min: 0, max: 100, step: 0.1 },
    alignment: { value: 5, min: 0, max: 20, step: 0.1 },
  });
  const size = Math.max(1.5, Math.pow(numBoids, 1 / 3) / 4);

  return (
    <div id="canvas-container" style={{ width: "100vw", height: "100vh" }}>
      <Leva titleBar={false} hideCopyButton />
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 0] }}
      >
        <Stats showPanel={0} className="stats" />
        <OrbitControls enablePan={false} enableZoom={false} />
        <ResetCamera size={size} />
        <color attach="background" args={["#87CEEB"]} />
        <ambientLight intensity={0.4} color="#ffffff" />
        {/* <hemisphereLight intensity={0.8} color="#87CEEB" /> */}
        <directionalLight castShadow intensity={1} position={[0, 100, 80]} />
        <Boids
          size={size}
          count={numBoids}
          speed={1.5}
          cohesionFactor={cohesion}
          seperationFactor={seperation}
          alignmentFactor={alignment}
          useGrid={useSpatialGrid}
          debug={debug}
        />
        <Plane size={size} />
      </Canvas>
    </div>
  );
}

export default App;
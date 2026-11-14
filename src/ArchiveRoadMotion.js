import {CubicBezierCurve3, Vector3} from 'three';

export const ROAD_CYCLE = 60;
export const COURIER_PARK = Object.freeze([7.18, -.89, 3.45]);
export const ROAD_BOUNDS = Object.freeze({left: -6.10, right: 10.15, front: 8.55, junction: 5.85, spurLeft: 6.60, spurRight: 10.07, spurEnd: -.24});
export const SHUTTLE_STOP = Object.freeze([-1, 6.66]);
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
export const easeRoad = (value, start, end) => {
  const f = clamp((value - start) / (end - start));
  return f * f * (3 - 2 * f);
};
const speedRamp = (value, start, end) => {
  const f = clamp((value - start) / (end - start));
  return 6 * f * (1 - f) / (end - start);
};
const elapsed = seconds => Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
const yawFrom = tangent => Math.atan2(-tangent.x, -tangent.z);
const line = (x, z, endX, endZ) => {
  const dx = endX - x, dz = endZ - z, length = Math.hypot(dx, dz);
  return {length, sample(d, position, tangent) {
    position.set(x + dx * d / length, 0, z + dz * d / length);
    tangent.set(dx / length, 0, dz / length);
  }};
};
const turn = (x, z, radius, angle, sweep) => ({
  length: Math.abs(sweep) * radius,
  sample(d, position, tangent) {
    const sign = Math.sign(sweep), theta = angle + sign * d / radius;
    position.set(x + Math.cos(theta) * radius, 0, z + Math.sin(theta) * radius);
    tangent.set(-Math.sin(theta) * sign, 0, Math.cos(theta) * sign);
  },
});

function makeRoute(segments, closed = false) {
  const length = segments.reduce((sum, segment) => sum + segment.length, 0);
  const position = new Vector3(), before = new Vector3(), after = new Vector3();
  function sample(d, p, tangent) {
    d = closed ? ((d % length) + length) % length : Math.max(0, Math.min(length, d));
    for (const segment of segments) {
      if (d <= segment.length || segment === segments[segments.length - 1]) {
        segment.sample(Math.min(d, segment.length), p, tangent);
        return;
      }
      d -= segment.length;
    }
  }
  function curvature(d) {
    const delta = .11;
    sample(d - delta, position, before);
    sample(d + delta, position, after);
    return Math.atan2(before.z * after.x - before.x * after.z, before.dot(after)) / (2 * delta);
  }
  // Integrating a curvature cost lets both vehicles coast into the bends and
  // pick up speed on the straights, with zero velocity at their actual stops.
  const count = 640, step = length / count, cost = new Float64Array(count + 1);
  for (let i = 1; i <= count; i++) {
    const weight = 1 + .52 * Math.min(1.5, Math.abs(curvature((i - .5) * step)));
    cost[i] = cost[i - 1] + step * weight;
  }
  function costAt(d) {
    const index = Math.min(count - 1, Math.max(0, Math.floor(d / step)));
    return cost[index] + (cost[index + 1] - cost[index]) * clamp(d / step - index);
  }
  function sampleCost(value, out) {
    let lo = 0, hi = count;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cost[mid] <= value) lo = mid; else hi = mid;
    }
    const scale = step / (cost[hi] - cost[lo]);
    out.routeDistance = (lo + clamp((value - cost[lo]) / (cost[hi] - cost[lo]))) * step;
    out.costSlope = scale;
    sample(out.routeDistance, out.position, out.tangent);
  }
  return {length, costAt, totalCost: cost[count], sample, sampleCost, curvature};
}

export function makeCourierRoute() {
  const [parkX, , parkZ] = COURIER_PARK;
  const turnZ = 2.15, farTurnZ = 6.62, eastX = 9.11, innerX = 7.54;
  const easeIntoTurn = new CubicBezierCurve3(
    new Vector3(parkX, 0, parkZ), new Vector3(parkX, 0, 3.05),
    new Vector3(innerX, 0, 2.65), new Vector3(innerX, 0, turnZ),
  );
  const approachLength = easeIntoTurn.getLength();
  return makeRoute([
    {length: approachLength, sample(d, p, tangent) {
      easeIntoTurn.getPointAt(d / approachLength, p);
      easeIntoTurn.getTangentAt(d / approachLength, tangent);
    }},
    turn((innerX + eastX) / 2, turnZ, (eastX - innerX) / 2, Math.PI, Math.PI),
    line(eastX, turnZ, eastX, farTurnZ),
    turn((eastX + parkX) / 2, farTurnZ, (eastX - parkX) / 2, 0, Math.PI),
    line(parkX, farTurnZ, parkX, 5.80),
  ]);
}

export function makeShuttleRoute() {
  const westX = -4.70, eastX = 8.16, middleZ = 7.20;
  const nearZ = SHUTTLE_STOP[1], radius = middleZ - nearZ, farZ = middleZ + radius;
  return makeRoute([
    line(westX, nearZ, eastX, nearZ),
    turn(eastX, middleZ, radius, -Math.PI / 2, Math.PI),
    line(eastX, farZ, westX, farZ),
    turn(westX, middleZ, radius, Math.PI / 2, Math.PI),
  ], true);
}

export function travelState() {
  return {position: new Vector3(), tangent: new Vector3(), distance: 0, speed: 0, yaw: 0, curvature: 0};
}

export function serviceState() {
  return {casePosition: new Vector3(), driverPosition: new Vector3()};
}

// The shuttle exchanges the same book crate on a supported roller bridge.
// It returns to its deck before departure; no hidden replacement is spawned.
export function shuttleServiceAt(seconds, travel, out = serviceState()) {
  const t = elapsed(seconds) % ROAD_CYCLE;
  const slide = easeRoad(t, 22, 25) * (1 - easeRoad(t, 27, 30));
  out.gate = easeRoad(t, 19, 21) * (1 - easeRoad(t, 30, 31));
  out.bridge = easeRoad(t, 20, 21.8) * (1 - easeRoad(t, 30, 31));
  out.casePosition.set(
    travel.position.x + Math.sin(travel.yaw) * .40,
    .435 + .044 * slide,
    travel.position.z + Math.cos(travel.yaw) * .40 - 1.10 * slide,
  );
  out.caseYaw = travel.yaw;
  out.slide = slide;
  out.task = t < 8 ? 'aguardar a doca livre' : t < 18 ? 'conduzir até a biblioteca' : t < 22 ? 'abrir a lateral e estender os roletes' : t < 25 ? 'levar os livros à conferência' : t < 27 ? 'conferir a caixa na recepção' : t < 30 ? 'recolher a mesma caixa conferida' : t < 31 ? 'recolher a ponte e fechar a lateral' : t < 58 ? 'retornar pela rua' : 'aguardar a próxima entrega';
  return out;
}

// One continuous service cycle: the crate is never hidden, replaced or scaled.
// Its receiving cradle and the lift share the same .075 m deck elevation.
export function courierServiceAt(seconds, travel, out = serviceState()) {
  const t = elapsed(seconds) % ROAD_CYCLE;
  const [parkX, ground, parkZ] = COURIER_PARK;
  const intoBed = t < 18.2 || t >= 33.4;
  let crateZ = parkZ + .46, crateY = .414;
  if (t >= 18.2 && t < 19) {
    const f = easeRoad(t, 18.2, 19); crateZ += .72 * f; crateY += .021 * f;
  } else if (t >= 19 && t < 32.4) {
    crateZ = parkZ + 1.18;
    crateY = .435 - .36 * easeRoad(t, 19, 22) + .36 * easeRoad(t, 31, 32.4);
    if (t >= 23 && t < 28.5) crateZ += .55 * easeRoad(t, 23, 26);
    else if (t >= 28.5) crateZ += .55 * (1 - easeRoad(t, 28.5, 31));
  } else if (t >= 32.4 && t < 33.4) {
    const f = easeRoad(t, 32.4, 33.4); crateZ = parkZ + 1.18 - .72 * f; crateY = .435 - .021 * f;
  }
  if (intoBed) {
    out.casePosition.set(travel.position.x + Math.sin(travel.yaw) * .46, ground + .414, travel.position.z + Math.cos(travel.yaw) * .46);
    out.caseYaw = travel.yaw;
  } else {out.casePosition.set(parkX, ground + crateY, crateZ); out.caseYaw = 0;}
  out.liftAngle = Math.PI / 2 * easeRoad(t, 16.2, 18.2) * (1 - easeRoad(t, 33.5, 35));
  out.liftY = .394 - .36 * easeRoad(t, 19, 22) + .36 * easeRoad(t, 31, 32.4);
  out.door = easeRoad(t, 8.5, 9.7) * (1 - easeRoad(t, 12, 13)) + easeRoad(t, 36.5, 37.5) * (1 - easeRoad(t, 39.3, 40.4));
  out.grip = easeRoad(t, 19, 20) * (1 - easeRoad(t, 26, 27.2)) + easeRoad(t, 28, 28.5) * (1 - easeRoad(t, 32.4, 33.4));
  out.crateHeight = crateY;
  out.seated = 1; out.walking = false; out.walkWeight = 0; out.walkDistance = 0; out.driverYaw = travel.yaw;
  const outsideX = parkX + .87, outsideZ = parkZ - .18;
  const workX = parkX + .56, workZ = parkZ + 1.18;
  const inCab = () => out.driverPosition.set(travel.position.x + Math.cos(travel.yaw) * .168 - Math.sin(travel.yaw) * .34, ground, travel.position.z - Math.sin(travel.yaw) * .168 - Math.cos(travel.yaw) * .34);
  inCab();
  const walk = f => {
    // A rounded path around the back corner, rather than a straight line
    // cutting through the cab, rear wheel or loading platform.
    const k = 1 - f, x = k*k*k*outsideX + 3*k*k*f*outsideX + 3*k*f*f*(outsideX+.07) + f*f*f*workX;
    const z = k*k*k*outsideZ + 3*k*k*f*(outsideZ+.80) + 3*k*f*f*workZ + f*f*f*workZ;
    const dx = 6*k*f*.07 + 3*f*f*(workX-outsideX-.07);
    const dz = 3*k*k*.80 + 6*k*f*(workZ-outsideZ-.80);
    out.driverPosition.set(x, ground, z);
    return Math.atan2(-dx, -dz);
  };
  if (t >= 9.7 && t < 11.7) {
    const f = easeRoad(t, 9.7, 11.7); out.seated = 1-f;
    out.driverPosition.set(parkX+.168+(.87-.168)*f, ground, parkZ-.34+.16*f); out.driverYaw = -Math.PI/2*f;
  } else if (t >= 11.7 && t < 13) {
    out.seated=0; out.driverPosition.set(outsideX,ground,outsideZ); out.driverYaw=-Math.PI/2-Math.PI/2*easeRoad(t,11.7,13);
  } else if (t >= 13 && t < 16.2) {
    const f=easeRoad(t,13,16.2);out.seated=0;out.driverYaw=walk(f);out.walking=true;out.walkWeight=easeRoad(t,13,13.3)*(1-easeRoad(t,15.9,16.2));out.walkDistance=f*1.63;
  } else if (t >= 16.2 && t < 33.4) {
    out.seated=0;out.driverYaw=Math.PI/2;out.driverPosition.set(workX,ground,t>=23&&t<31?crateZ:workZ);
    if(t>=23&&t<26){out.walking=true;out.walkWeight=easeRoad(t,23,23.3)*(1-easeRoad(t,25.7,26));out.walkDistance=-(crateZ-workZ);}
    else if(t>=28.5&&t<31){out.walking=true;out.walkWeight=easeRoad(t,28.5,28.8)*(1-easeRoad(t,30.7,31));out.walkDistance=crateZ-workZ;}
  } else if(t>=33.4&&t<34.2){
    out.seated=0;out.driverPosition.set(workX,ground,workZ);out.driverYaw=Math.PI/2-Math.PI*easeRoad(t,33.4,34.2);
  } else if(t>=34.2&&t<36.7){
    const f=easeRoad(t,34.2,36.7);out.seated=0;out.driverYaw=walk(1-f)+Math.PI;out.walking=true;out.walkWeight=easeRoad(t,34.2,34.5)*(1-easeRoad(t,36.4,36.7));out.walkDistance=f*1.63;
  } else if(t>=36.7&&t<37.5){out.seated=0;out.driverPosition.set(outsideX,ground,outsideZ);out.driverYaw=0;
  } else if(t>=37.5&&t<39.2){
    const f=easeRoad(t,37.5,39.2);out.seated=f;out.driverPosition.set(outsideX-(.87-.168)*f,ground,outsideZ-.16*f);out.driverYaw=0;
  }
  out.task=t<8?'chegar à doca':t<9.7?'abrir a porta da cabine':t<11.7?'descer pelo estribo':t<13?'fechar a porta':t<16.2?'contornar o veículo':t<19?'abrir a plataforma e rolar a caixa':t<23?'baixar a carga com apoio':t<26?'levar a caixa à recepção':t<28?'conferir os volumes':t<31?'retornar a caixa conferida':t<33.4?'recolher a carga na plataforma':t<36.7?'retornar à cabine':t<39.2?'subir pelo estribo':t<41?'fechar a cabine e preparar a saída':'retornar pela rua';
  return out;
}

export function courierTravelAt(seconds, route, out = travelState()) {
  const total = elapsed(seconds), phase = total % ROAD_CYCLE;
  const cycle = Math.floor(total / ROAD_CYCLE), approach = 2.35;
  const [x, , parkZ] = COURIER_PARK;
  let tripDistance = approach, speed = 0, curvature = 0;
  out.position.set(x, 0, parkZ);
  out.tangent.set(0, 0, -1);
  if (phase < 8) {
    tripDistance = approach * easeRoad(phase, 0, 8);
    out.position.z += approach - tripDistance;
    speed = approach * speedRamp(phase, 0, 8);
  } else if (phase >= 41 && phase < 58) {
    route.sampleCost(route.totalCost * easeRoad(phase, 41, 58), out);
    tripDistance += out.routeDistance;
    speed = route.totalCost * speedRamp(phase, 41, 58) * out.costSlope;
    curvature = route.curvature(out.routeDistance);
  } else if (phase >= 58) {
    out.position.z += approach;
    tripDistance += route.length;
  }
  out.phase = phase;
  out.distance = cycle * (approach + route.length) + tripDistance;
  out.speed = speed;
  out.curvature = curvature;
  out.yaw = yawFrom(out.tangent);
  out.spin = -(out.distance / .167) % TAU;
  return out;
}

export function shuttleTravelAt(seconds, route, out = travelState()) {
  const total = elapsed(seconds), phase = total % ROAD_CYCLE;
  const cycle = Math.floor(total / ROAD_CYCLE), stopCost = route.costAt(SHUTTLE_STOP[0] + 4.70);
  let cost = 0, derivative = 0;
  if (phase >= 8 && phase < 18) {
    cost = stopCost * easeRoad(phase, 8, 18);
    derivative = stopCost * speedRamp(phase, 8, 18);
  } else if (phase >= 18 && phase < 31) cost = stopCost;
  else if (phase >= 31 && phase < 58) {
    const remaining = route.totalCost - stopCost;
    cost = stopCost + remaining * easeRoad(phase, 31, 58);
    derivative = remaining * speedRamp(phase, 31, 58);
  } else if (phase >= 58) cost = route.totalCost;
  route.sampleCost(cost, out);
  out.phase = phase;
  out.distance = cycle * route.length + out.routeDistance;
  out.speed = derivative * out.costSlope;
  out.curvature = route.curvature(out.routeDistance);
  out.yaw = yawFrom(out.tangent);
  out.spin = -(out.distance / .17) % TAU;
  return out;
}

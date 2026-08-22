import * as THREE from "three";

// PROJECT TITAN — Elite simulated-player brain.
// This is intentionally separate from PvE archetype logic: it models a rival player
// with imperfect perception, short-term memory, prediction, range control and flanking.
export class ElitePlayerAI {
  constructor(titan, player, options = {}) {
    this.titan = titan;
    this.player = player;
    this.callsign = options.callsign ?? titan.callSign ?? "ACE";
    this.skill = THREE.MathUtils.clamp(options.skill ?? 0.92, 0, 1);

    this.decisionTimer = 0;
    this.decisionInterval = THREE.MathUtils.lerp(0.28, 0.12, this.skill);
    this.state = "assess";
    this.confidence = 0;

    this.lastObserved = new THREE.Vector3();
    this.previousObserved = new THREE.Vector3();
    this.estimatedVelocity = new THREE.Vector3();
    this.predictedTarget = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    this.memoryAge = 999;
    this.observationAge = 999;
    this.flankSide = Math.random() < 0.5 ? -1 : 1;
    this.flankTimer = 1.5 + Math.random() * 2.0;
    this.strafeTimer = 0.8 + Math.random() * 1.4;

    this.stats = {
      decisions: 0,
      sightings: 0,
      predictionUses: 0,
      flankChanges: 0
    };
  }

  observe(dt, hasLOS, heard) {
    this.memoryAge += dt;
    this.observationAge += dt;

    if (hasLOS) {
      const p = this.player.group.position;
      if (this.observationAge < 0.45 && this.observationAge > 0.001) {
        this.estimatedVelocity.copy(p).sub(this.lastObserved).multiplyScalar(1 / this.observationAge);
        const maxSpeed = 9.0;
        if (this.estimatedVelocity.lengthSq() > maxSpeed * maxSpeed) {
          this.estimatedVelocity.setLength(maxSpeed);
        }
      } else {
        this.estimatedVelocity.multiplyScalar(0.35);
      }
      this.previousObserved.copy(this.lastObserved);
      this.lastObserved.copy(p);
      this.observationAge = 0;
      this.memoryAge = 0;
      this.confidence = Math.min(1, this.confidence + dt * 3.2);
      this.stats.sightings++;
    } else if (heard) {
      // Hearing refreshes confidence but never grants exact through-wall coordinates here.
      this.memoryAge = Math.min(this.memoryAge, 1.25);
      this.confidence = Math.min(0.72, this.confidence + dt * 1.2);
    } else {
      this.confidence = Math.max(0, this.confidence - dt * 0.12);
    }
  }

  chooseState(hasLOS, dist) {
    const healthRatio = this.titan.health / Math.max(1, this.titan.maxHealth);
    const armorRatio = this.titan.armor / Math.max(1, this.titan.maxArmor || 1);

    if (hasLOS) {
      if (healthRatio < 0.28 && dist < 20) return "break_contact";
      if (dist < 6.5) return "create_space";
      if (dist > 28) return "close_angle";
      if (armorRatio < 0.25 && dist < 14) return "defensive_strafe";
      return "combat_strafe";
    }

    if (this.memoryAge < 2.8) return "predict_flank";
    if (this.memoryAge < 7.0) return "search_last_seen";
    return "reacquire";
  }

  buildMovement(hasLOS, dist) {
    const self = this.titan.group.position;
    const target = hasLOS ? this.player.group.position : this.predictedTarget;
    const toward = this.tmp.copy(target).sub(self);
    toward.y = 0;
    if (toward.lengthSq() < 0.0001) toward.set(0, 0, -1);
    toward.normalize();
    const lateral = this.tmp2.set(-toward.z, 0, toward.x).multiplyScalar(this.flankSide);

    this.moveDirection.set(0, 0, 0);
    switch (this.state) {
      case "break_contact":
        this.moveDirection.addScaledVector(toward, -0.82).addScaledVector(lateral, 0.58);
        break;
      case "create_space":
        this.moveDirection.addScaledVector(toward, -0.62).addScaledVector(lateral, 0.78);
        break;
      case "close_angle":
        this.moveDirection.addScaledVector(toward, 0.88).addScaledVector(lateral, 0.34);
        break;
      case "defensive_strafe":
        this.moveDirection.addScaledVector(toward, -0.18).addScaledVector(lateral, 0.96);
        break;
      case "combat_strafe": {
        const rangeBias = dist > 17 ? 0.24 : dist < 10 ? -0.22 : 0;
        this.moveDirection.addScaledVector(toward, rangeBias).addScaledVector(lateral, 1.0);
        break;
      }
      case "predict_flank":
        this.moveDirection.addScaledVector(toward, 0.62).addScaledVector(lateral, 0.82);
        break;
      case "search_last_seen":
        this.moveDirection.addScaledVector(toward, 0.86).addScaledVector(lateral, 0.28);
        break;
      default:
        this.moveDirection.addScaledVector(toward, 0.55).addScaledVector(lateral, 0.42);
        break;
    }
    if (this.moveDirection.lengthSq() > 0.0001) this.moveDirection.normalize();
  }

  update(dt, context) {
    const hasLOS = !!context.hasLOS;
    const heard = !!context.heard;
    const dist = context.dist ?? 999;
    this.observe(dt, hasLOS, heard);

    this.flankTimer -= dt;
    this.strafeTimer -= dt;
    if (this.flankTimer <= 0 || this.strafeTimer <= 0) {
      // Direction changes are intentionally irregular so the rival is readable but not clockwork.
      if (Math.random() < 0.62) {
        this.flankSide *= -1;
        this.stats.flankChanges++;
      }
      this.flankTimer = 1.8 + Math.random() * 3.2;
      this.strafeTimer = 0.75 + Math.random() * 1.45;
    }

    // Predict only from legitimately observed motion. Confidence decays after LOS is lost.
    this.predictedTarget.copy(this.lastObserved);
    if (!hasLOS && this.memoryAge < 3.2) {
      const predictionWindow = Math.min(this.memoryAge, 1.35);
      this.predictedTarget.addScaledVector(this.estimatedVelocity, predictionWindow);
      this.stats.predictionUses++;
    }

    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.decisionInterval + Math.random() * 0.055;
      this.state = this.chooseState(hasLOS, dist);
      this.stats.decisions++;
    }

    this.buildMovement(hasLOS, dist);
    return {
      state: this.state,
      moveDirection: this.moveDirection,
      predictedTarget: this.predictedTarget,
      confidence: this.confidence,
      memoryAge: this.memoryAge
    };
  }
}

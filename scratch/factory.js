class Thing {
  static _name = 'base';
  static subThings = {};
  static register(clss) {
    let type = clss._name;
    console.log('register', type);
    this.subThings[type] = clss;
  }
  static {
    Thing.register(this);
  }
  static createThing(type, value) {
    return new (this.subThings[type])(value);
  }
  static createEverything(value) {
    return Object.keys(this.subThings).map(k => this.createThing(k, value));
  }
  /***************************************************************/
  #value;
  constructor(value) {
    this.#value = value;
    console.log('contructor', this.name);
  }
  get name() {
    return this.constructor._name;
  }
  get value() {
    return this.#value;
  }
}

class SpecialThing extends Thing {
  static _name = 'special';
}
Thing.register(SpecialThing);

class ModernThing extends Thing {
  static _name = 'modern';
  static {
    super.register(this);
  }
}

class KindaThing extends Thing {
  static _name = 'kinda';
  static {
    super.register(this);
  }
}

class Builder {
  static buildAll(commonValue) {
    return Thing.createEverything(commonValue);
  }
}

/*let thingB = Thing.createThing('base', 1);
console.log(thingB.name, thingB.value);

let thingS = Thing.createThing('special', 2);
console.log(thingS.name, thingS.value);

let thingM = Thing.createThing('modern', 3);
console.log(thingM.name, thingM.value);

let thingK = Thing.createThing('kinda', 4);
console.log(thingK.name, thingK.value);*/

let things = Builder.buildAll(42);
things.forEach(t => console.log(t.name, t.value));
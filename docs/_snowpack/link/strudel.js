import Fraction from "../pkg/fractionjs.js";
var removeUndefineds = function(xs) {
  return xs.filter((x) => x != void 0);
};
function flatten(arr) {
  return [].concat(...arr);
}
var id = (a) => a;
function curry(func) {
  return function curried(...args) {
    if (args.length >= func.length) {
      return func.apply(this, args);
    } else {
      return function(...args2) {
        return curried.apply(this, args.concat(args2));
      };
    }
  };
}
Fraction.prototype.sam = function() {
  return Fraction(Math.floor(this));
};
Fraction.prototype.nextSam = function() {
  return this.sam().add(1);
};
Fraction.prototype.wholeCycle = function() {
  return new TimeSpan(this.sam(), this.nextSam());
};
Fraction.prototype.lt = function(other) {
  return this.compare(other) < 0;
};
Fraction.prototype.gt = function(other) {
  return this.compare(other) > 0;
};
Fraction.prototype.lte = function(other) {
  return this.compare(other) <= 0;
};
Fraction.prototype.gte = function(other) {
  return this.compare(other) >= 0;
};
Fraction.prototype.eq = function(other) {
  return this.compare(other) == 0;
};
Fraction.prototype.max = function(other) {
  return this.gt(other) ? this : other;
};
Fraction.prototype.min = function(other) {
  return this.lt(other) ? this : other;
};
Fraction.prototype.show = function() {
  return this.n + "/" + this.d;
};
Fraction.prototype.or = function(other) {
  return this.eq(0) ? other : this;
};
class TimeSpan {
  constructor(begin, end) {
    this.begin = Fraction(begin);
    this.end = Fraction(end);
  }
  get spanCycles() {
    var spans = [];
    var begin = this.begin;
    var end = this.end;
    var end_sam = end.sam();
    while (end.gt(begin)) {
      if (begin.sam().equals(end_sam)) {
        spans.push(new TimeSpan(begin, this.end));
        break;
      }
      var next_begin = begin.nextSam();
      spans.push(new TimeSpan(begin, next_begin));
      begin = next_begin;
    }
    return spans;
  }
  withTime(func_time) {
    return new TimeSpan(func_time(this.begin), func_time(this.end));
  }
  intersection(other) {
    var intersect_begin = this.begin.max(other.begin);
    var intersect_end = this.end.min(other.end);
    if (intersect_begin.gt(intersect_end)) {
      return void 0;
    }
    if (intersect_begin.equals(intersect_end)) {
      if (intersect_begin.equals(this.end) && this.begin.lt(this.end)) {
        return void 0;
      }
      if (intersect_begin.equals(other.end) && other.begin.lt(other.end)) {
        return void 0;
      }
    }
    return new TimeSpan(intersect_begin, intersect_end);
  }
  intersection_e(other) {
    var result = this.intersection(other);
    if (result == void 0) {
    }
    return result;
  }
  get midpoint() {
    return this.begin.add(this.end.sub(this.begin).div(Fraction(2)));
  }
  equals(other) {
    return this.begin.equals(other.begin) && this.end.equals(other.end);
  }
  show() {
    return this.begin.show() + " -> " + this.end.show();
  }
}
class Hap {
  constructor(whole, part, value) {
    this.whole = whole;
    this.part = part;
    this.value = value;
  }
  withSpan(func) {
    var whole = this.whole ? func(this.whole) : void 0;
    return new Hap(whole, func(this.part), this.value);
  }
  withValue(func) {
    return new Hap(this.whole, this.part, func(this.value));
  }
  hasOnset() {
    return this.whole != void 0 && this.whole.begin.equals(this.part.begin);
  }
  spanEquals(other) {
    return this.whole == void 0 && other.whole == void 0 || this.whole.equals(other.whole);
  }
  equals(other) {
    return this.spanEquals(other) && this.part.equals(other.part) && this.value === other.value;
  }
  show() {
    return "(" + (this.whole == void 0 ? "~" : this.whole.show()) + ", " + this.part.show() + ", " + this.value + ")";
  }
}
class Pattern {
  constructor(query2) {
    this.query = query2;
  }
  _splitQueries() {
    var pat = this;
    var q = function(span) {
      return flatten(span.spanCycles.map((subspan) => pat.query(subspan)));
    };
    return new Pattern(q);
  }
  withQuerySpan(func) {
    return new Pattern((span) => this.query(func(span)));
  }
  withQueryTime(func) {
    return new Pattern((span) => this.query(span.withTime(func)));
  }
  withEventSpan(func) {
    return new Pattern((span) => this.query(span).map((hap) => hap.withSpan(func)));
  }
  withEventTime(func) {
    return this.withEventSpan((span) => span.withTime(func));
  }
  _withEvents(func) {
    return new Pattern((span) => func(this.query(span)));
  }
  withValue(func) {
    return new Pattern((span) => this.query(span).map((hap) => hap.withValue(func)));
  }
  fmap(func) {
    return this.withValue(func);
  }
  _filterEvents(event_test) {
    return new Pattern((span) => this.query(span).filter(event_test));
  }
  _filterValues(value_test) {
    return new Pattern((span) => this.query(span).filter((hap) => value_test(hap.value)));
  }
  onsetsOnly() {
    return this._filterEvents((hap) => hap.hasOnset());
  }
  _appWhole(whole_func, pat_val) {
    var pat_func = this;
    query = function(span) {
      var event_funcs = pat_func.query(span);
      var event_vals = pat_val.query(span);
      apply = function(event_func, event_val) {
        var s = event_func.part.intersection(event_val.part);
        if (s == void 0) {
          return void 0;
        }
        return new Hap(whole_func(event_func.whole, event_val.whole), s, event_func.value(event_val.value));
      };
      return flatten(event_funcs.map((event_func) => removeUndefineds(event_vals.map((event_val) => apply(event_func, event_val)))));
    };
    return new Pattern(query);
  }
  appBoth(pat_val) {
    var whole_func = function(span_a, span_b) {
      if (span_a == void 0 || span_B == void 0) {
        return void 0;
      }
      return span_a.intersection_e(span_b);
    };
    return this._appWhole(whole_func, pat_val);
  }
  appLeft(pat_val) {
    var pat_func = this;
    var query2 = function(span) {
      var haps = [];
      for (var hap_func of pat_func.query(span)) {
        var event_vals = pat_val.query(hap_func.part);
        for (var hap_val of event_vals) {
          var new_whole = hap_func.whole;
          var new_part = hap_func.part.intersection_e(hap_val.part);
          var new_value = hap_func.value(hap_val.value);
          var hap = new Hap(new_whole, new_part, new_value);
          haps.push(hap);
        }
      }
      return haps;
    };
    return new Pattern(query2);
  }
  appRight(pat_val) {
    var pat_func = this;
    var query2 = function(span) {
      var haps = [];
      for (var hap_val of pat_val.query(span)) {
        var hap_funcs = pat_func.query(hap_val.part);
        for (var hap_func of hap_funcs) {
          var new_whole = hap_val.whole;
          var new_part = hap_func.part.intersection_e(hap_val.part);
          var new_value = hap_func.value(hap_val.value);
          var hap = new Hap(new_whole, new_part, new_value);
          haps.push(hap);
        }
      }
      return haps;
    };
    return new Pattern(query2);
  }
  get firstCycle() {
    return this.query(new TimeSpan(Fraction(0), Fraction(1)));
  }
  _sortEventsByPart() {
    return this._withEvents((events) => events.sort((a, b) => a.part.begin.sub(b.part.begin).or(a.part.end.sub(b.part.end)).or(a.whole.begin.sub(b.whole.begin).or(a.whole.end.sub(b.whole.end)))));
  }
  _opleft(other, func) {
    return this.fmap(func).appLeft(reify(other));
  }
  add(other) {
    return this._opleft(other, (a) => (b) => a + b);
  }
  sub(other) {
    return this._opleft(other, (a) => (b) => a - b);
  }
  union(other) {
    return this._opleft(other, (a) => (b) => Object.assign({}, a, b));
  }
  _bindWhole(choose_whole, func) {
    var pat_val = this;
    var query2 = function(span) {
      var withWhole = function(a, b) {
        return new Hap(choose_whole(a.whole, b.whole), b.part, b.value);
      };
      var match = function(a) {
        return func(a.value).query(a.part).map((b) => withWhole(a, b));
      };
      return flatten(pat_val.query(span).map((a) => match(a)));
    };
    return new Pattern(query2);
  }
  bind(func) {
    var whole_func = function(a, b) {
      if (a == void 0 || b == void 0) {
        return void 0;
      }
      return a.intersection_e(b);
    };
    return this._bindWhole(whole_func, func);
  }
  join() {
    return this.bind(id);
  }
  innerBind(func) {
    return this._bindWhole((a, _) => a, func);
  }
  innerJoin() {
    return this.innerBind(id);
  }
  outerBind(func) {
    return this._bindWhole((_, b) => b, func);
  }
  outerJoin() {
    return this.outerBind(id);
  }
  _fast(factor) {
    var fastQuery = this.withQueryTime((t) => t.mul(factor));
    return fastQuery.withEventTime((t) => t.div(factor));
  }
  _slow(factor) {
    return this._fast(1 / factor);
  }
  _early(offset) {
    offset = Fraction(offset);
    return this.withQueryTime((t) => t.add(offset)).withEventTime((t) => t.sub(offset));
  }
  _late(offset) {
    return this._early(0 - offset);
  }
  when(binary_pat, func) {
    var true_pat = binary_pat._filterValues(id);
    var false_pat = binary_pat._filterValues((val) => !val);
    var with_pat = true_pat.fmap((_) => (y) => y).appRight(func(this));
    var without_pat = false_pat.fmap((_) => (y) => y).appRight(this);
    return stack(with_pat, without_pat);
  }
  off(time_pat, func) {
    return stack([this, func(this._early(time_pat))]);
  }
  every(n, func) {
    var pats = Array(n - 1).fill(this);
    pats.unshift(this);
    return slowcat(...pats);
  }
  append(other) {
    return fastcat(...[this, other]);
  }
  rev() {
    var pat = this;
    var query2 = function(span) {
      var cycle = span.begin.sam();
      var next_cycle = span.begin.nextSam();
      var reflect = function(to_reflect) {
        var reflected = to_reflect.withTime((time) => cycle.add(next_cycle.sub(time)));
        var tmp = reflected.begin;
        reflected.begin = reflected.end;
        reflected.end = tmp;
        return reflected;
      };
      var haps = pat.query(reflect(span));
      return haps.map((hap) => hap.withSpan(reflect));
    };
    return new Pattern(query2)._splitQueries();
  }
  jux(func, by = 1) {
    by /= 2;
    var elem_or = function(dict, key, dflt) {
      if (key in dict) {
        return dict[key];
      }
      return dflt;
    };
    var left = this.withValue((val) => Object.assign({}, val, {pan: elem_or(val, "pan", 0.5) - by}));
    var right = this.withValue((val) => Object.assign({}, val, {pan: elem_or(val, "pan", 0.5) + by}));
    return stack([left, func(right)]);
  }
}
const silence = new Pattern((_) => []);
function pure(value) {
  function query2(span) {
    return span.spanCycles.map((subspan) => new Hap(Fraction(subspan.begin).wholeCycle(), subspan, value));
  }
  return new Pattern(query2);
}
function steady(value) {
  return new Pattern((span) => Hap(void 0, span, value));
}
function reify(thing) {
  if (thing.constructor.name == "Pattern") {
    return thing;
  }
  return pure(thing);
}
function stack(...pats) {
  var pats = pats.map((pat) => reify(pat));
  var query2 = function(span) {
    return flatten(pats.map((pat) => pat.query(span)));
  };
  return new Pattern(query2);
}
function slowcat(...pats) {
  pats = pats.map(reify);
  var query2 = function(span) {
    var pat = pats[Math.floor(span.begin) % pats.length];
    return pat.query(span);
  };
  return new Pattern(query2)._splitQueries();
}
function fastcat(...pats) {
  return slowcat(...pats)._fast(pats.length);
}
function cat(...pats) {
  return fastcat(...pats);
}
function _sequenceCount(x) {
  if (Array.isArray(x)) {
    if (x.length == 0) {
      return [silence, 0];
    }
    if (x.length == 1) {
      return _sequenceCount(x[0]);
    }
    return [fastcat(...x.map((a) => _sequenceCount(a)[0])), x.length];
  }
  return [reify(x), 1];
}
function sequence(...xs) {
  return _sequenceCount(xs)[0];
}
function polymeter(steps = 0, ...args) {
  var seqs = args.map((a) => _sequenceCount(a));
  if (seqs.length == 0) {
    return silence;
  }
  if (steps == 0) {
    steps = seqs[0][1];
  }
  var pats = [];
  for (var seq of seqs) {
    if (seq[1] == 0) {
      next;
    }
    if (steps == seq[1]) {
      pats.push(seq[0]);
    } else {
      pats.push(seq[0]._fast(Fraction(steps).div(Fraction(seq[1]))));
    }
  }
  return stack(pats);
}
function pm(args) {
  polymeter(args);
}
function polyrhythm(...xs) {
  var seqs = xs.map((a) => sequence(a));
  if (seqs.length == 0) {
    return silence;
  }
  return stack(...seqs);
}
function pr(args) {
  polyrhythm(args);
}
export {
  Fraction,
  TimeSpan,
  Hap,
  Pattern,
  pure,
  stack,
  slowcat,
  fastcat,
  cat,
  sequence,
  polymeter,
  pm,
  polyrhythm,
  pr,
  reify,
  silence
};

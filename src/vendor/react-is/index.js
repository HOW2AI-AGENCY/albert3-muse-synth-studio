const REACT_ELEMENT_TYPE = Symbol.for('react.element');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_MEMO_TYPE = Symbol.for('react.memo');
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');

function typeOf(object) {
  if (object && typeof object === 'object') {
    const $$typeof = object.$$typeof;
    switch ($$typeof) {
      case REACT_ELEMENT_TYPE:
        return REACT_ELEMENT_TYPE;
      default:
        return $$typeof;
    }
  }
  return undefined;
}

function isElement(object) {
  return typeOf(object) === REACT_ELEMENT_TYPE;
}

function isValidElementType(type) {
  return typeof type === 'string' || typeof type === 'function' || typeof type === 'object';
}

function isForwardRef(object) {
  return object && object.$$typeof === REACT_FORWARD_REF_TYPE;
}

function isMemo(object) {
  return object && object.$$typeof === REACT_MEMO_TYPE;
}

function isFragment(object) {
  return !!(object && object.$$typeof === REACT_ELEMENT_TYPE && object.type === REACT_FRAGMENT_TYPE);
}

export {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  typeOf,
  isElement,
  isValidElementType,
  isForwardRef,
  isMemo,
  isFragment,
};

package com.jfmprinthub.stock;

/** IN adds stock (quantity &gt; 0), OUT removes it (quantity &lt; 0), ADJUST may be either sign. */
public enum MovementType {
    IN, OUT, ADJUST
}

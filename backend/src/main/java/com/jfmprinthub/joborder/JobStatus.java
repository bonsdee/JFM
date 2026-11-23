package com.jfmprinthub.joborder;

import java.util.EnumSet;
import java.util.Set;

/** Printing workflow pipeline. */
public enum JobStatus {
    PENDING, DESIGNING, FOR_APPROVAL, PRINTING, READY_FOR_PICKUP, CLAIMED, CANCELLED;

    /** Items/specs may still be edited in these states. */
    public static final Set<JobStatus> EDITABLE = EnumSet.of(PENDING, DESIGNING, FOR_APPROVAL);

    public boolean isOpen() {
        return this != CLAIMED && this != CANCELLED;
    }

    /**
     * Allowed moves on the Kanban board. Work can move freely between the pre-print stages,
     * forward to printing/ready, and be cancelled until claimed. CLAIMED is only reached via the claim action.
     */
    public boolean canMoveTo(JobStatus target) {
        if (this == target) return true;
        if (!isOpen()) return false;
        return switch (target) {
            case PENDING, DESIGNING, FOR_APPROVAL, PRINTING -> this != READY_FOR_PICKUP || target == PRINTING;
            case READY_FOR_PICKUP -> true;
            case CANCELLED -> true;
            case CLAIMED -> false;
        };
    }
}

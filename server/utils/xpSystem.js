/**
 * XP System Logic
 * Pure functions for calculating XP based on user actions.
 */

// --- GLOBAL RULES ---
const XP_to_next_level = (level) => 100 * (Math.pow(level, 1.2));

const calculateLevel = (totalXP) => {
    let level = 1;
    let xp = totalXP;
    while (true) {
        const needed = XP_to_next_level(level);
        if (xp < needed) break;
        xp -= needed;
        level++;
    }
    return { level, currentXP: Math.floor(xp), neededXP: Math.floor(XP_to_next_level(level)) };
};

// --- GYM XP ---
const BASE_WORKOUT_XP = 40;

const RPE_MULTIPLIERS = {
    6: 1.0, 7: 1.0,
    8: 1.2,
    9: 1.4,
    10: 1.1
};

const PRE_WORKOUT_MULTIPLIERS = {
    'Energized': 1.05,
    'Neutral': 1.0,
    'Tired': 1.1
};

/**
 * Calculate Gym Session XP
 * @param {Object} session - The current session data
 * @param {Array} session.sets - Array of sets { rpe, restInterval, weight, reps, feeling }
 * @param {String} session.preWorkoutState - "Energized", "Neutral", "Tired"
 * @param {Object} comparisonStats - Map of exerciseId -> { lastWeight, lastReps } for overload check
 */
const calculateGymXP = (session, comparisonStats = {}) => {
    let xp = BASE_WORKOUT_XP;
    const breakdown = [{ label: 'Base Workout XP', xp: BASE_WORKOUT_XP }];
    const multipliers = [];

    // Pre-Workout Multiplier
    const stateMult = PRE_WORKOUT_MULTIPLIERS[session.preWorkoutState] || 1.0;
    if (stateMult !== 1.0) {
        multipliers.push({ name: `State: ${session.preWorkoutState}`, value: stateMult });
    }

    // Process Sets
    let setXPTotal = 0;
    const overloadApplied = new Set(); // Track overload per exercise

    session.sets.forEach((set, index) => {
        let setMult = 1.0;

        // RPE
        const rpeVal = RPE_MULTIPLIERS[Math.round(set.rpe)] || 1.0;
        setMult *= rpeVal;

        // Execution (Rest)
        // Note: Assuming target rest is passed or standard. Rules say:
        // Proper rest (±20% target): 1.0. Rushed/Excessive: 0.85.
        // We need targetRest in the set object or defaults. assuming standard 90s if missing?
        // Actually, the prompt implies checking against a target.
        // For now, if no target, assume neutral (1.0). If target provided:
        if (set.targetRest) {
            const ratio = set.restInterval / set.targetRest;
            if (ratio >= 0.8 && ratio <= 1.2) {
                // 1.0
            } else {
                setMult *= 0.85; // Rushed or excessive
            }
        }

        // Qualitative Note
        let execBonus = 0;
        if (set.feeling && set.feeling.length > 0) {
            execBonus = 0.1;
        }

        // Cap execution multiplier (Execution includes Rest + Note bonus, but RPE is separate? 
        // Prompt says: "SET_XP = 5 * RPE_MULTIPLIER * EXECUTION_MULTIPLIER"
        // Execution Rules: Rest (1.0 or 0.85) + Note (+0.1). Cap at 1.1.
        let executionMult = 1.0;
        // Logic check: "Proper rest: 1.0, Rushed: 0.85". 
        // START base execution is determined by rest.
        if (set.targetRest) {
            const ratio = set.restInterval / set.targetRest;
            if (ratio < 0.8 || ratio > 1.2) executionMult = 0.85;
        }

        if (execBonus > 0) executionMult += execBonus;

        if (executionMult > 1.1) executionMult = 1.1;

        const setXP = 5 * rpeVal * executionMult;
        setXPTotal += setXP;

        // Progressive Overload
        // "If weight OR reps increased compared to last session"
        // +10 XP per exercise (once per exercise per session)
        if (!overloadApplied.has(set.exerciseId) && comparisonStats[set.exerciseId]) {
            const last = comparisonStats[set.exerciseId];
            if (set.weight > last.lastWeight || set.reps > last.lastReps) {
                overloadApplied.add(set.exerciseId);
                breakdown.push({ label: `Overload Bonus (${set.exerciseId})`, xp: 10 });
                xp += 10;
            }
        }
    });

    breakdown.push({ label: 'Sets XP', xp: Math.floor(setXPTotal) });
    xp += setXPTotal;

    // Apply Pre-Workout Multiplier to TOTAL
    if (stateMult !== 1.0) {
        xp *= stateMult;
    }

    // Caps
    let softCapHit = false;
    let hardCapHit = false;

    if (xp > 350) {
        hardCapHit = true;
        const overHard = xp - 350;
        const overSoft = 350 - 250; // The chunk between 250 and 350

        // First 250 is normal
        // 250-350 is x0.5
        // >350 is x0.2

        // Re-calc carefully:
        // Raw XP structure:
        // Part A (0-250)
        // Part B (250-350) -> scaled 0.5
        // Part C (>350) -> scaled 0.2

        // BUT logic says: "XP beyond [250] x 0.5". "XP beyond [350] x 0.2".
        // Use standard tiered calculation.

        const rawXP = xp;
        xp = 250 + (100 * 0.5) + ((rawXP - 350) * 0.2);
    } else if (xp > 250) {
        softCapHit = true;
        xp = 250 + ((xp - 250) * 0.5);
    }

    return {
        totalXP: Math.floor(xp),
        breakdown,
        multipliersApplied: multipliers,
        capsApplied: { softCapHit, hardCapHit }
    };
};

// --- STUDY XP ---
const BASE_STUDY_XP = 20;

const STUDY_QUALITY_MULTIPLIERS = {
    'Light': 0.8,
    'Normal': 1.0,
    'Deep': 1.4
};

const calculateStudyXP = (session, examDetails) => {
    let xp = BASE_STUDY_XP;
    const breakdown = [{ label: 'Base Study XP', xp: BASE_STUDY_XP }];
    const multipliers = [];

    // Duration XP
    // DURATION_XP = sqrt(minutes) * 4
    if (session.durationMinutes) {
        const durXP = Math.sqrt(session.durationMinutes) * 4;
        breakdown.push({ label: `Duration (${session.durationMinutes}m)`, xp: Math.floor(durXP) });
        xp += durXP;
    }

    // Quality Multiplier
    const qualityMult = STUDY_QUALITY_MULTIPLIERS[session.quality] || 1.0;
    if (qualityMult !== 1.0) multipliers.push({ name: `Quality: ${session.quality}`, value: qualityMult });

    // Interruption Penalty
    // 1 - min(interruptions * 0.05, 0.4)
    let interruptMult = 1.0;
    if (session.interruptions > 0) {
        const penalty = Math.min(session.interruptions * 0.05, 0.4);
        interruptMult = 1.0 - penalty;
        multipliers.push({ name: `Interruptions (${session.interruptions})`, value: interruptMult });
    }

    // Context Switching
    // Prompt: Social/Chaotic: 0.85, Neutral: 1.0, Related: 1.05
    // Field: session.preSessionActivity? or environment? Prompt says "Context Switching Multiplier". 
    // Usually implies pre-session activity.
    let contextMult = 1.0;
    // Map strings to values based on keywords or exact match
    if (session.preSessionActivity) {
        const act = session.preSessionActivity.toLowerCase();
        if (act.includes('gaming') || act.includes('social') || act.includes('chaotic')) contextMult = 0.85;
        else if (act.includes('preparation') || act.includes('related')) contextMult = 1.05;

        if (contextMult !== 1.0) multipliers.push({ name: 'Context Switching', value: contextMult });
    }

    // Apply Multipliers
    let totalMult = qualityMult * interruptMult * contextMult;
    xp *= totalMult;

    // Exam Proximity Bonus
    // If exam date <= 14 days away: Study XP x 1.1
    if (examDetails && examDetails.date) {
        const diffTime = new Date(examDetails.date) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 14 && diffDays >= 0) {
            multipliers.push({ name: 'Exam Proximity (<14 days)', value: 1.1 });
            xp *= 1.1;
        }
    }

    // Topic Completion Bonus
    // +50 XP (once per topic). Caller handles "is completed now" check?
    // "When sessionsCompleted === totalSessionsGoal"
    if (session.isTopicCompleted) {
        breakdown.push({ label: 'Topic Completion', xp: 50 });
        xp += 50;
    }

    // Caps
    let softCapHit = false;
    let hardCapHit = false;
    // Soft: 300, Hard: 450
    const rawXP = xp;
    if (xp > 450) { // Using same logic as Gym? Prompt doesn't specify soft cap MULTIPLIER, just "Soft cap: 300 XP". 
        // AND "Hard cap: 450 XP". 
        // Usually soft cap implies diminishing returns. 
        // Gym specified "XP beyond x 0.5". Study just says "Soft cap: 300 XP".
        // I will assume same diminishing return curve as Gym (x0.5 after soft, x0.2 after hard) 
        // OR simple clamp? "Soft cap: 300 XP" might mean clamp to 300? 
        // NO, "Hard cap: 450" implies you can go above 300.
        // I will ASSUME the standard mechanics (x0.5 after soft, x0.2 after hard) for consistency, 
        // unless strictly different. The Gym prompt was very specific: "XP beyond x 0.5".
        // The Study prompt says "Soft cap: 300 XP". 
        // I will apply x0.5 scaling after 300, and x0.2 after 450.

        hardCapHit = true;
        xp = 300 + (150 * 0.5) + ((rawXP - 450) * 0.2);
    } else if (xp > 300) {
        softCapHit = true;
        xp = 300 + ((xp - 300) * 0.5);
    }

    return {
        totalXP: Math.floor(xp),
        breakdown,
        multipliersApplied: multipliers,
        capsApplied: { softCapHit, hardCapHit }
    };
};

// --- TASK XP ---
const BASE_TASK_XP = 15;
const COGNITIVE_LOAD_MULTIPLIERS = { 'Low': 0.8, 'Medium': 1.0, 'High': 1.4 };
const IMPORTANCE_MULTIPLIERS = { 'Low': 0.8, 'Medium': 1.0, 'High': 1.5 };

const calculateTaskXP = (task) => {
    let xp = BASE_TASK_XP;
    const breakdown = [{ label: 'Base Task XP', xp: BASE_TASK_XP }];
    const multipliers = [];

    const loadMult = COGNITIVE_LOAD_MULTIPLIERS[task.priority] || 1.0; // cognitive load mapped to priority? 
    // Prompt says "Cognitive Load Multiplier". Task model has "priority" (low/med/high) and "importance" (low/med/high).
    // I will map Priority -> Cognitive Load.
    if (loadMult !== 1.0) multipliers.push({ name: `Load: ${task.priority}`, value: loadMult });

    const impMult = IMPORTANCE_MULTIPLIERS[task.importance] || 1.0;
    if (impMult !== 1.0) multipliers.push({ name: `Importance: ${task.importance}`, value: impMult });

    xp = xp * loadMult * impMult;

    // Strategic Task Bonus
    // If High Load AND High Importance: +10 XP
    if (task.priority === 'High' && task.importance === 'High') {
        breakdown.push({ label: 'Strategic Bonus', xp: 10 });
        xp += 10;
    }

    return {
        totalXP: Math.floor(xp),
        breakdown,
        multipliersApplied: multipliers,
        capsApplied: { softCapHit: false, hardCapHit: false }
    };
};

module.exports = {
    calculateLevel,
    calculateGymXP,
    calculateStudyXP,
    calculateTaskXP
};

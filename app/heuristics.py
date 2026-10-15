"""Static reference data: Nielsen's 10 heuristics, the 0–4 severity scale, and a sample evaluation."""

SEVERITIES = [
    {"level": 0, "name": "Not a problem", "description": "I don't agree that this is a usability problem at all."},
    {"level": 1, "name": "Cosmetic", "description": "Cosmetic problem only: need not be fixed unless extra time is available on the project."},
    {"level": 2, "name": "Minor", "description": "Minor usability problem: fixing this should be given low priority."},
    {"level": 3, "name": "Major", "description": "Major usability problem: important to fix, so should be given high priority."},
    {"level": 4, "name": "Catastrophe", "description": "Usability catastrophe: imperative to fix this before the product can be released."},
]

HEURISTICS = [
    {"title": "Visibility of system status",
     "description": "The system should always keep users informed about what is going on, through appropriate feedback within reasonable time."},
    {"title": "Match between system and the real world",
     "description": "The system should speak the users' language, with words, phrases and concepts familiar to the user, rather than system-oriented terms. Follow real-world conventions, making information appear in a natural and logical order."},
    {"title": "User control and freedom",
     "description": "Users often choose system functions by mistake and will need a clearly marked \"emergency exit\" to leave the unwanted state without having to go through an extended dialogue. Support undo and redo."},
    {"title": "Consistency and standards",
     "description": "Users should not have to wonder whether different words, situations, or actions mean the same thing."},
    {"title": "Error prevention",
     "description": "Even better than good error messages is a careful design which prevents a problem from occurring in the first place. Either eliminate error-prone conditions or check for them and present users with a confirmation option before they commit to the action."},
    {"title": "Recognition rather than recall",
     "description": "Keep objects, actions and options visible so users don't have to hold information in memory from one step to the next. Instructions should be visible or easy to retrieve when needed."},
    {"title": "Flexibility and efficiency of use",
     "description": "Shortcuts, hidden from novices, can speed up interaction for experts, so the design serves both. Let users tailor the actions they repeat often."},
    {"title": "Aesthetic and minimalist design",
     "description": "Screens should not carry information that is irrelevant or rarely needed. Every extra element competes with the relevant ones and lowers their visibility."},
    {"title": "Help users recognize, diagnose, and recover from errors",
     "description": "Error messages should use plain language rather than codes, state the problem precisely, and suggest a constructive way forward."},
    {"title": "Help and documentation",
     "description": "The system should ideally work without documentation, but help may still be needed. Keep it easy to search, focused on the user's task, written as concrete steps, and short."},
]

HEURISTIC_COUNT = len(HEURISTICS)
MAX_SEVERITY = len(SEVERITIES) - 1

SAMPLE_META = {
    "name": "Sample – guest checkout",
    "evaluator": "Sample evaluator",
    "site": "Demo store – checkout",
    "device": "MacBook Air 13\"",
    "browser": "Chrome 129 / macOS 15",
    "task": "Buy one item as a guest and apply a discount code",
}

SAMPLE_ITEMS = [
    (3, "No loading state after tapping \"Pay now\". The button stays active for ~4s, and two users pressed it again.",
     "Disable the button and show an inline spinner with \"Processing payment…\". Confirm success on a dedicated screen."),
    (1, "Shipping options are labelled \"SVC-STD\" and \"SVC-EXP\".",
     "Use \"Standard (3–5 days)\" and \"Express (next day)\"."),
    (2, "No way to remove the discount code once applied.",
     "Add a \"Remove\" link next to the applied code."),
    (2, "Primary buttons are green on cart but blue on checkout.",
     "Use one primary button style across the flow."),
    (4, "Card expiry accepts past dates; the error appears only after the payment gateway rejects it and the form is cleared.",
     "Validate expiry inline and keep entered data when a payment fails."),
    (None, "", ""),
    (0, "Experts asked for keyboard shortcuts in checkout; not needed for this task.", ""),
    (1, "Promo banner repeats on every checkout step.",
     "Show it on the cart page only."),
    (3, "Error \"ERR_402\" shown when the code is invalid.",
     "Say \"This code has expired. Check the date or try another code.\""),
    (None, "", ""),
]

import type { Evaluation, Item, ListEntry, MetaField } from "./types";
import { toEntry } from "./utils";

export interface State {
  list: ListEntry[];
  ev: Evaluation | null;
}

export type Action =
  | { type: "listLoaded"; list: ListEntry[] }
  | { type: "opened"; ev: Evaluation }           // show an evaluation without reordering the sidebar
  | { type: "replaced"; ev: Evaluation }         // new / duplicated / reset: show it and move it to the top
  | { type: "meta"; field: MetaField; value: string }
  | { type: "item"; index: number; patch: Partial<Pick<Item, "severity" | "issues" | "recommendation">> }
  | { type: "removed"; id: number }
  | { type: "closed" };

export const initialState: State = { list: [], ev: null };

// Any edit marks the evaluation as most recently updated, matching the server's list order.
const touched = (state: State, ev: Evaluation): State => ({
  ev,
  list: [toEntry(ev), ...state.list.filter(e => e.id !== ev.id)],
});

export function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "listLoaded":
      return { ...state, list: a.list };
    case "opened":
      return { ...state, ev: a.ev };
    case "replaced":
      return touched(state, a.ev);
    case "meta":
      return state.ev ? touched(state, { ...state.ev, [a.field]: a.value }) : state;
    case "item": {
      if (!state.ev) return state;
      const items = state.ev.items.map((it, i) => (i === a.index ? { ...it, ...a.patch } : it));
      return touched(state, { ...state.ev, items });
    }
    case "removed":
      return { list: state.list.filter(e => e.id !== a.id), ev: state.ev?.id === a.id ? null : state.ev };
    case "closed":
      return { ...state, ev: null };
  }
}

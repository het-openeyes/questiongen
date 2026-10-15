import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** A textarea that grows to fit its content. */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [props.value]);
  return <textarea ref={ref} {...props} />;
}

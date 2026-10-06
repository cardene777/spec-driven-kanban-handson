export class ApiError extends Error {
 constructor(public status: number, public code: string, public fields?: Record<string,string>) { super(code); }
}
export function validate(data: Record<string,unknown>, kind: "board"|"list"|"card", creating: boolean) {
 const fields: Record<string,string> = {};
 const max = kind === "card" ? 200 : 100;
 if (creating || "title" in data) if (typeof data.title !== "string" || data.title.length < 1 || data.title.length > max) fields.title = `1〜${max}文字の文字列が必要です`;
 if ("description" in data && (typeof data.description !== "string" || data.description.length > 2000)) fields.description = "0〜2000文字の文字列が必要です";
 if (kind !== "board" && "order" in data && (!Number.isInteger(data.order) || (data.order as number) < 0)) fields.order = "0以上の整数が必要です";
 if (Object.keys(fields).length) throw new ApiError(422,"validation_error",fields);
}

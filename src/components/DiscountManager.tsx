import { useEffect, useState } from "react";

type Discount = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "freeDelivery";
  value: number;
  start?: string;
  end?: string;
};

export default function DiscountManager() {
  const [codes, setCodes] = useState<Discount[]>([]);
  const [editing, setEditing] = useState<Discount | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("discountCodes");
      if (stored) setCodes(JSON.parse(stored));
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const persist = (next: Discount[]) => {
    setCodes(next);
    localStorage.setItem("discountCodes", JSON.stringify(next));
  };

  const create = () => {
    const d: Discount = { id: String(Date.now()), code: "NEWCODE", type: "fixed", value: 0 };
    persist([...codes, d]);
  };

  const update = (id: string, patch: Partial<Discount>) => {
    const next = codes.map((c) => (c.id === id ? { ...c, ...patch } : c));
    persist(next);
  };

  const remove = (id: string) => {
    const next = codes.filter((c) => c.id !== id);
    persist(next);
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Discount Codes</h3>
        <button onClick={create} className="rounded bg-blue-600 px-3 py-1 text-white">Create</button>
      </div>

      {codes.length === 0 ? (
        <p className="text-sm text-gray-500">No discount codes yet</p>
      ) : (
        codes.map((c) => (
          <div key={c.id} className="border rounded p-3 mb-2">
            <div className="flex gap-2 items-center">
              <input className="w-40 rounded border p-1" value={c.code} onChange={(e) => update(c.id, { code: e.target.value })} />
              <select className="rounded border p-1" value={c.type} onChange={(e) => update(c.id, { type: e.target.value as any })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
                <option value="freeDelivery">Free Delivery</option>
              </select>
              {c.type !== "freeDelivery" && (
                <input type="number" className="w-24 rounded border p-1" value={c.value} onChange={(e) => update(c.id, { value: Number(e.target.value) })} />
              )}
              <input type="date" className="rounded border p-1" value={c.start || ""} onChange={(e) => update(c.id, { start: e.target.value })} />
              <input type="date" className="rounded border p-1" value={c.end || ""} onChange={(e) => update(c.id, { end: e.target.value })} />
              <button className="ml-auto text-red-600" onClick={() => remove(c.id)}>Delete</button>
            </div>
            {c.type === "percentage" && <p className="text-xs text-gray-500 mt-1">{c.value}% off</p>}
            {c.type === "fixed" && <p className="text-xs text-gray-500 mt-1">{c.value} fixed off</p>}
          </div>
        ))
      )}
    </div>
  );
}

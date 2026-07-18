// spec/002_lists.md § 画面 / spec/003_cards.md § 画面
import CardCreateForm from "./CardCreateForm";
import CardItem from "./CardItem";

type Card = {
  id: string;
  title: string;
  description: string;
  order: number;
  listId: string;
};

type List = {
  id: string;
  boardId: string;
  title: string;
  order: number;
};

export default function ListColumn({
  list,
  cards,
}: {
  list: List;
  cards: Card[];
}) {
  return (
    <section className="w-72 shrink-0 rounded-lg bg-slate-100 p-3">
      <h2 className="mb-3 px-1 text-sm font-semibold text-slate-800">
        {list.title}
      </h2>
      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <li key={card.id}>
            <CardItem card={card} />
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <CardCreateForm listId={list.id} />
      </div>
    </section>
  );
}

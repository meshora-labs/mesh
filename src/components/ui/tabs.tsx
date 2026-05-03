import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

interface TabItem<T extends string> {
	id: T;
	label: string;
}

interface TabsProps<T extends string> {
	items: TabItem<T>[];
	value: T;
	onChange: (value: T) => void;
	children?: ReactNode;
}

export function Tabs<T extends string>({
	items,
	value,
	onChange,
	children,
}: TabsProps<T>) {
	return (
		<div className="tabs">
			<div className="tabs__list" role="tablist">
				{items.map((item) => (
					<button
						aria-selected={item.id === value}
						className={cx("tabs__trigger", item.id === value && "is-active")}
						key={item.id}
						onClick={() => onChange(item.id)}
						role="tab"
						type="button"
					>
						{item.label}
					</button>
				))}
			</div>
			{children}
		</div>
	);
}

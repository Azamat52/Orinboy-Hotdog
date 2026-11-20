import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ProductCartControl({ product, quantity, onChange, onAdd }) {
  return (
    <div className="product-cart-control">
      {quantity > 0 && (
        <div className="card-quantity" aria-label={`${product.name} miqdori`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="card-qty-button"
            aria-label={`${product.name} kamaytirish`}
            onClick={() => onChange(-1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <output aria-live="polite">{quantity}</output>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="card-qty-button"
            aria-label={`${product.name} oshirish`}
            onClick={() => onChange(1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        className="add-btn"
        aria-label={`${product.name} savatga qo‘shish`}
        onClick={onAdd}
      >
        <ShoppingCart aria-hidden="true" />
        {quantity > 0 ? "Qo‘shish" : "Savatga qo‘shish"}
      </Button>
    </div>
  );
}

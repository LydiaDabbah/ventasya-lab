import { use } from "react";
import { ProductDetailProvider } from "@/context/ProductDetailContext";
import ProductDetailPage from "@/components/productDetailPage";

export default function Page({ params }) {
  const { slug } = use(params);
  return (
    <ProductDetailProvider slug={slug}>
      <ProductDetailPage slug={slug} />
    </ProductDetailProvider>
  );
}

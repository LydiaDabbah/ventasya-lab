import { use } from "react";
import { ProductDetailProvider } from "@/context/ProductDetailContext";
import ProductDetailPage from "@/components/ProductDetailPage";

export default function Page({ params }) {
  const { slug } = use(params);
  console.log("Slug recibido:", slug);

  return (
    <ProductDetailProvider slug={slug}>
      <ProductDetailPage slug={slug} />
    </ProductDetailProvider>
  );
}

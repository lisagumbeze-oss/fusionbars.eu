import ProductAdminDetail from '@/components/admin/ProductAdminDetail';

export default async function ProductAdminPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved = await params;
  return <ProductAdminDetail slug={resolved.slug} />;
}

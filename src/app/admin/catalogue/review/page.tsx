import LocaleLayout from '../../[locale]/layout';
import CatalogueReviewCenterPage from '../../[locale]/admin/catalogue/review/page';

export default function DirectCatalogueReviewPage() {
  return (
    <LocaleLayout params={Promise.resolve({ locale: 'en' })}>
      <CatalogueReviewCenterPage />
    </LocaleLayout>
  );
}

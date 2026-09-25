import LocaleLayout from './[locale]/layout';
import HomePage from './[locale]/page';

export default function RootPage() {
  return (
    <LocaleLayout params={Promise.resolve({ locale: 'en' })}>
      <HomePage params={Promise.resolve({ locale: 'en' })} />
    </LocaleLayout>
  );
}

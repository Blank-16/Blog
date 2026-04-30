import { Suspense } from 'react';
import SearchPage from '@/page-components/SearchPage';

export const metadata = { title: 'Search' };

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}

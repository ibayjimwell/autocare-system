import { permanentRedirect } from 'next/navigation';

/** Backward compatibility for previously submitted /explore URLs. */
export default function ExploreRedirect() {
  permanentRedirect('/');
}

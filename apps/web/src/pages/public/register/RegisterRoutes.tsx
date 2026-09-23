import { useParams } from 'react-router-dom';
import { REGISTER_KINDS, stateBySlug } from '../../../lib/registerMeta';
import RegisterHubPage from './RegisterHubPage';
import RegisterListPage from './RegisterListPage';
import RegisterProviderPage from './RegisterProviderPage';

type Path = keyof typeof REGISTER_KINDS;

/** /ndis-providers */
export function RegisterHubRoute({ path }: { path: Path }) {
  return <RegisterHubPage kind={REGISTER_KINDS[path]} />;
}

/**
 * /ndis-providers/:first — a state page when `first` is a state code
 * (nsw, vic, …), otherwise a provider. The API guarantees no provider
 * slug can equal a state code (registerNormalise.safeProviderSlug), so
 * the two never collide.
 */
export function RegisterSingleRoute({ path }: { path: Path }) {
  const { first = '' } = useParams();
  const kind = REGISTER_KINDS[path];
  return stateBySlug(first)
    ? <RegisterListPage key={`${path}/${first}`} kind={kind} stateSlug={first.toLowerCase()} />
    : <RegisterProviderPage key={`${path}/${first}`} kind={kind} slug={first.toLowerCase()} />;
}

/** /ndis-providers/:state/:suburb */
export function RegisterSuburbRoute({ path }: { path: Path }) {
  const { state = '', suburb = '' } = useParams();
  return <RegisterListPage key={`${path}/${state}/${suburb}`} kind={REGISTER_KINDS[path]} stateSlug={state.toLowerCase()} suburbSlug={suburb.toLowerCase()} />;
}

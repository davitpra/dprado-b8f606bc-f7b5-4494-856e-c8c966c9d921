import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideChevronRight })],
  templateUrl: './breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly navigationEnd = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => true),
      startWith(true),
    ),
  );

  readonly breadcrumbs = computed(() => {
    this.navigationEnd();

    const crumbs: Breadcrumb[] = [];
    let route = this.activatedRoute.root;
    let url = '';

    while (route.children.length > 0) {
      route = route.children[0];
      const segments = route.snapshot.url.map((s) => s.path);
      if (segments.length > 0) {
        url += '/' + segments.join('/');
      }

      const breadcrumb = route.snapshot.data['breadcrumb'] as string | undefined;
      if (breadcrumb) {
        crumbs.push({ label: breadcrumb, url });
      }
    }

    return crumbs;
  });
}

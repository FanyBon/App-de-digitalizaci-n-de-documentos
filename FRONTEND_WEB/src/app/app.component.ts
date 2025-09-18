// src/app/app.component.ts

import { Component, OnInit }      from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap }  from 'rxjs/operators';

import { HeaderComponent }   from './components/header/header.component';
import { SidebarComponent }  from './components/sidebar/sidebar.component';
import { FooterComponent }   from './components/footer/footer.component';
import { CommonModule }      from '@angular/common';
import { RouterModule }      from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    RouterModule,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showMainLayout = true;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      // <-- Nada de "as Data", route.data ya es Observable<Data>
      mergeMap(route => route.data)
    ).subscribe(data => {
      const flag = data['showLayout'];     
      this.showMainLayout = flag !== false;
    });
  }
}

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.token || localStorage.getItem('binova_admin_token');

  const addToken = (r: HttpRequest<any>, t: string) =>
    r.clone({ setHeaders: { Authorization: `Bearer ${t}` } });

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && err.error?.code === 'TOKEN_EXPIRED') {
        const refresh = localStorage.getItem('binova_admin_refresh');
        if (!refresh) { auth.logout(); return throwError(() => err); }

        return inject(HttpClient).post(`${environment.apiUrl}/auth/refresh-token`, { refreshToken: refresh }).pipe(
          switchMap((res: any) => {
            auth.token = res.accessToken;
            localStorage.setItem('binova_admin_token', res.accessToken);
            return next(addToken(req, res.accessToken));
          }),
          catchError(e => { auth.logout(); return throwError(() => e); })
        );
      }
      return throwError(() => err);
    })
  );
};

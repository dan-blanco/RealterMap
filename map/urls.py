from django.urls import path
from map import views

urlpatterns = [
        path('',views.Index.as_view(),name='index'),
        path('DataJSON',views.AjaxDataJSON.as_view(), name="state-data"),
]

---
layout: archive
title: "Sitemap"
permalink: /sitemap/
sitemap: false
---

- [Home and team](/)
- [Publications](/publications/)
- [Resources and citation](/resources/)
- [Privacy](/terms/)

## Publication pages

{% for publication in site.publications reversed %}
- [{{ publication.title }}]({{ publication.url }})
{% endfor %}

The [XML sitemap](/sitemap.xml) lists the pages intended for indexing.

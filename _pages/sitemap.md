---
layout: archive
title: "Sitemap"
permalink: /sitemap/
sitemap: false
---

- [Home and team](/)
- [Publications](/publications/)
- [Using FH*](/guide/)
- [Header type specifications](/specifications/)
  - [FHR schema reference](/specifications/fhr/)
  - [FHT schema reference (draft)](/specifications/fht/)
  - [FHP schema reference](/specifications/fhp/)
  - [FHGFF3 schema reference](/specifications/fhgff3/)
  - [FHGM gene model records (draft)](/specifications/fhgm/)
- [FHR table builder](/table-builder/)
- [Resources and citation](/resources/)
- [Privacy](/terms/)

## Publication pages

{% for publication in site.publications reversed %}
- [{{ publication.title }}]({{ publication.url }})
{% endfor %}

The [XML sitemap](/sitemap.xml) lists the pages intended for indexing.

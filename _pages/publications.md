---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% if site.author.googlescholar %}
  <div class="wordwrap">You can also find my articles on <a href="{{site.author.googlescholar}}">my Google Scholar profile</a>.</div>
{% endif %}

Research on FAIR bioHeaders and related work by Adam Wright and David Molik on genome nomenclature, data standards, and FAIR data sharing. Related articles provide context for the project; each publication page explains its connection.

{% include base_path %}

{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
